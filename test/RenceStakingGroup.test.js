const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RenceStakingGroup", function () {
  let usdt, treasury, group, owner, addr1, addr2, addr3, addr4, addr5;
  const baseStake = ethers.utils.parseUnits("100", 6); // 100 USDT (6 decimals)
  const totalCycles = 5;
  const cycleDuration = 60 * 60 * 24 * 7; // 1 week

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners();
    // Deploy mock USDT
    const USDT = await ethers.getContractFactory("MockUSDT");
    usdt = await USDT.deploy();
    await usdt.deployed();
    // Mint USDT to all participants
    for (let user of [owner, addr1, addr2, addr3, addr4, addr5]) {
      await usdt.mint(user.address, ethers.utils.parseUnits("1000", 6));
    }
    // Deploy treasury
    const Treasury = await ethers.getContractFactory("RenceTreasury");
    treasury = await Treasury.deploy(usdt.address);
    await treasury.deployed();
    // Authorize group contract after deployment
    // Deploy group contract
    const Group = await ethers.getContractFactory("RenceStakingGroup");
    group = await Group.deploy(usdt.address, treasury.address, baseStake, totalCycles, cycleDuration);
    await group.deployed();
    await treasury.authorizeGroup(group.address, true);
    // Creator approves and joins as first participant
    const creatorStake = baseStake.mul(102).div(100);
    await usdt.connect(owner).approve(group.address, creatorStake);
    await group.connect(owner).joinGroup();
  });

  it("should deploy and initialize correctly", async function () {
    expect(await group.creator()).to.equal(owner.address);
    expect(await group.baseStake()).to.equal(baseStake);
    expect(await group.totalCycles()).to.equal(totalCycles);
    expect(await group.groupActive()).to.equal(true);
  });

  it("should allow participants to join and stake", async function () {
    for (let user of [addr1, addr2, addr3, addr4]) {
      await usdt.connect(user).approve(group.address, baseStake);
      await expect(group.connect(user).joinGroup())
        .to.emit(group, "Joined");
    }
    expect((await group.getParticipants()).length).to.equal(5); // owner + 4
  });

  it("should not allow more than 5 participants", async function () {
    for (let user of [addr1, addr2, addr3, addr4]) {
      await usdt.connect(user).approve(group.address, baseStake);
      await group.connect(user).joinGroup();
    }
    await usdt.connect(addr5).approve(group.address, baseStake);
    await expect(group.connect(addr5).joinGroup()).to.be.revertedWith("Group full");
  });

  it("should process payouts in join order and deduct fees", async function () {
    for (let user of [addr1, addr2, addr3, addr4]) {
      await usdt.connect(user).approve(group.address, baseStake);
      await group.connect(user).joinGroup();
    }
    // Approve group to transfer USDT for payout
    for (let i = 0; i < 5; i++) {
      const user = [owner, addr1, addr2, addr3, addr4][i];
      await expect(group.connect(user).payout())
        .to.emit(group, "Payout");
    }
    expect(await group.groupActive()).to.equal(false);
  });

  it("should handle defaults and penalties", async function () {
    for (let user of [addr1, addr2, addr3, addr4]) {
      await usdt.connect(user).approve(group.address, baseStake);
      await group.connect(user).joinGroup();
    }
    // Simulate default for addr2
    await expect(group.handleDefault(addr2.address))
      .to.emit(group, "DefaultHandled");
    // addr2 should be marked as defaulted
    const participants = await group.getParticipants();
    expect(participants[2].isDefaulted).to.equal(true);
  });

  it("should allow the group creator to claim 5% of platform fees after group dissolution", async function () {
    for (let user of [addr1, addr2, addr3, addr4]) {
      await usdt.connect(user).approve(group.address, baseStake);
      await group.connect(user).joinGroup();
    }
    // Process all payouts to dissolve the group
    for (let i = 0; i < 5; i++) {
      const user = [owner, addr1, addr2, addr3, addr4][i];
      await group.connect(user).payout();
    }
    // Calculate expected bonus
    const payoutAmount = baseStake.mul(5);
    const fee = payoutAmount.mul(3).div(100); // 3% fee per cycle
    const totalFee = fee.mul(5); // 5 cycles
    const expectedBonus = totalFee.mul(5).div(100); // 5% of total fees
    // Creator's balance before claim
    const before = await usdt.balanceOf(owner.address);
    // Bonus should have been claimed automatically in dissolveGroup
    const after = await usdt.balanceOf(owner.address);
    expect(after.sub(before)).to.equal(expectedBonus);
  });
}); 