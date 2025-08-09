// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import "./RenceTreasury.sol";

contract RenceNonStakingGroup {
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
    string public groupName;
    uint256 public contributionAmount;
    uint256 public cycleDuration;
    uint256 public currentCycle;
    uint256 public totalCycles;
    uint256 public maintenanceFeePercent = 5; // 5%
    uint256 public withheldPercent = 10; // 10% withheld
    bool public groupActive;
    uint256 public withheldAmount;
    uint256 public startTime;

    Participant[] public participants;
    mapping(address => uint256) public participantIndex;

    event GroupCreated(address indexed creator, string name, uint256 contributionAmount, uint256 totalCycles);
    event Joined(address indexed participant);
    event Contributed(address indexed participant, uint256 amount);
    event Payout(address indexed participant, uint256 amount);
    event DefaultHandled(address indexed participant, uint256 penalty);
    event WithheldReturned(uint256 amount);
    event GroupDissolved();

    modifier onlyCreator() {
        require(msg.sender == creator, "Not group creator");
        _;
    }

    modifier onlyActive() {
        require(groupActive, "Group not active");
        _;
    }

    constructor(address _usdt, address _treasury, string memory _name, uint256 _contributionAmount, uint256 _totalCycles, uint256 _cycleDuration) {
        require(_contributionAmount > 0, "Contribution must be > 0");
        require(_totalCycles > 0, "Cycles must be > 0");
        usdt = IERC20(_usdt);
        treasury = RenceTreasury(_treasury);
        creator = msg.sender;
        groupName = _name;
        contributionAmount = _contributionAmount;
        totalCycles = _totalCycles;
        cycleDuration = _cycleDuration;
        groupActive = true;
        startTime = block.timestamp;
        emit GroupCreated(msg.sender, _name, _contributionAmount, _totalCycles);
    }

    function joinGroup() external onlyActive {
        if (participants.length == 0) {
            require(msg.sender == creator, "Creator must join first");
            require(usdt.transferFrom(msg.sender, address(this), contributionAmount), "Contribution transfer failed");
            participants.push(Participant({
                addr: msg.sender,
                hasContributed: true,
                hasReceivedPayout: false,
                isDefaulted: false,
                joinTime: block.timestamp
            }));
            participantIndex[msg.sender] = 0;
            emit Joined(msg.sender);
            emit Contributed(msg.sender, contributionAmount);
        } else {
            require(participantIndex[msg.sender] == 0 && participants[0].addr != msg.sender, "Already joined");
            require(usdt.transferFrom(msg.sender, address(this), contributionAmount), "Contribution transfer failed");
            participants.push(Participant({
                addr: msg.sender,
                hasContributed: true,
                hasReceivedPayout: false,
                isDefaulted: false,
                joinTime: block.timestamp
            }));
            participantIndex[msg.sender] = participants.length - 1;
            emit Joined(msg.sender);
            emit Contributed(msg.sender, contributionAmount);
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
        uint256 payoutAmount = contributionAmount * participants.length;
        uint256 fee = (payoutAmount * maintenanceFeePercent) / 100;
        uint256 withheld = (payoutAmount * withheldPercent) / 100;
        uint256 netPayout = payoutAmount - fee - withheld;
        withheldAmount += withheld;
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
        // Penalty: remove from withheld amount
        uint256 penalty = contributionAmount;
        withheldAmount -= penalty;
        emit DefaultHandled(defaulter, penalty);
    }

    function dissolveGroup() internal {
        groupActive = false;
        // Return withheld amount if no defaults
        bool anyDefault = false;
        for (uint i = 0; i < participants.length; i++) {
            if (participants[i].isDefaulted) {
                anyDefault = true;
                break;
            }
        }
        if (!anyDefault && withheldAmount > 0) {
            require(usdt.transfer(creator, withheldAmount), "Return withheld failed");
            emit WithheldReturned(withheldAmount);
        }
        emit GroupDissolved();
    }

    // View functions
    function getParticipants() external view returns (Participant[] memory) {
        return participants;
    }
} 