// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import "./RenceTreasury.sol";

contract RenceStakingGroup {
    struct Participant {
        address addr;
        bool hasContributed;
        bool hasReceivedPayout;
        bool isDefaulted;
        uint256 joinTime;
    }

    IERC20 public usdt;
    RenceTreasury public treasury;
    address public creator;
    uint256 public baseStake;
    uint256 public cycleDuration;
    uint256 public currentCycle;
    uint256 public totalCycles;
    uint256 public maintenanceFeePercent = 3; // 3%
    uint256 public creatorFeePercent = 5; // 5% of platform fees at end
    uint256 public maxParticipants = 5;
    bool public groupActive;
    uint256 public stakedAmount;
    uint256 public startTime;

    Participant[] public participants;
    mapping(address => uint256) public participantIndex;

    event GroupCreated(address indexed creator, uint256 baseStake, uint256 totalCycles);
    event Joined(address indexed participant);
    event Contributed(address indexed participant, uint256 amount);
    event Payout(address indexed participant, uint256 amount);
    event DefaultHandled(address indexed participant, uint256 penalty);
    event GroupDissolved();

    modifier onlyCreator() {
        require(msg.sender == creator, "Not group creator");
        _;
    }

    modifier onlyActive() {
        require(groupActive, "Group not active");
        _;
    }

    constructor(address _usdt, address _treasury, uint256 _baseStake, uint256 _totalCycles, uint256 _cycleDuration) {
        require(_baseStake > 0, "Stake must be > 0");
        require(_totalCycles > 0, "Cycles must be > 0");
        usdt = IERC20(_usdt);
        treasury = RenceTreasury(_treasury);
        creator = msg.sender;
        baseStake = _baseStake;
        totalCycles = _totalCycles;
        cycleDuration = _cycleDuration;
        groupActive = true;
        startTime = block.timestamp;
        emit GroupCreated(msg.sender, _baseStake, _totalCycles);
    }

    function joinGroup() external onlyActive {
        if (participants.length == 0) {
            require(msg.sender == creator, "Creator must join first");
            uint256 creatorStake = (baseStake * 102) / 100;
            require(usdt.transferFrom(msg.sender, address(this), creatorStake), "Stake transfer failed");
            stakedAmount += creatorStake;
            participants.push(Participant({
                addr: msg.sender,
                hasContributed: true,
                hasReceivedPayout: false,
                isDefaulted: false,
                joinTime: block.timestamp
            }));
            participantIndex[msg.sender] = 0;
            emit Joined(msg.sender);
            emit Contributed(msg.sender, creatorStake);
        } else {
            require(participants.length < maxParticipants, "Group full");
            require(participantIndex[msg.sender] == 0 && participants[0].addr != msg.sender, "Already joined");
            require(usdt.transferFrom(msg.sender, address(this), baseStake), "Stake transfer failed");
            stakedAmount += baseStake;
            participants.push(Participant({
                addr: msg.sender,
                hasContributed: true,
                hasReceivedPayout: false,
                isDefaulted: false,
                joinTime: block.timestamp
            }));
            participantIndex[msg.sender] = participants.length - 1;
            emit Joined(msg.sender);
            emit Contributed(msg.sender, baseStake);
        }
    }

    function payout() external onlyActive {
        require(participantIndex[msg.sender] < participants.length, "Not a participant");
        Participant storage p = participants[participantIndex[msg.sender]];
        require(!p.hasReceivedPayout, "Already received payout");
        require(currentCycle < totalCycles, "All cycles complete");
        // Payout order: join order
        require(participantIndex[msg.sender] == currentCycle, "Not your payout turn");
        // Calculate payout amount
        uint256 payoutAmount = baseStake * participants.length;
        uint256 fee = (payoutAmount * maintenanceFeePercent) / 100;
        uint256 netPayout = payoutAmount - fee;
        // Transfer fee to treasury
        require(usdt.transfer(address(treasury), fee), "Fee transfer failed");
        treasury.receiveFee(fee);
        // Transfer payout
        require(usdt.transfer(msg.sender, netPayout), "Payout transfer failed");
        p.hasReceivedPayout = true;
        currentCycle++;
        emit Payout(msg.sender, netPayout);
        // If last cycle, dissolve group
        if (currentCycle == totalCycles) {
            dissolveGroup();
        }
    }

    function handleDefault(address defaulter) external onlyCreator onlyActive {
        require(participantIndex[defaulter] < participants.length, "Not a participant");
        Participant storage p = participants[participantIndex[defaulter]];
        require(!p.isDefaulted, "Already defaulted");
        p.isDefaulted = true;
        // Penalty: remove from staked amount
        uint256 penalty = baseStake;
        stakedAmount -= penalty;
        emit DefaultHandled(defaulter, penalty);
    }

    function dissolveGroup() internal {
        groupActive = false;
        // Return staked amounts to participants who did not default
        for (uint i = 0; i < participants.length; i++) {
            if (!participants[i].isDefaulted) {
                require(usdt.transfer(participants[i].addr, baseStake), "Return stake failed");
            }
        }
        // Creator receives 5% of platform fees (handled by treasury)
        treasury.claimGroupBonus(address(this), creator);
        emit GroupDissolved();
    }

    // View functions
    function getParticipants() external view returns (Participant[] memory) {
        return participants;
    }
} 