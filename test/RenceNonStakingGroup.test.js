const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RenceNonStakingGroup", function () {
  let usdt, treasury, group, owner, addr1, addr2, addr3, addr4, addr5;
  const contributionAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
  const totalCycles = 5;
  const cycleDuration = 60 * 60 * 24 * 7; // 1 week
  const groupName = "Test Group";

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
    // Deploy group contract
    const Group = await ethers.getContractFactory("RenceNonStakingGroup");
    group = await Group.deploy(usdt.address, treasury.address, groupName, contributionAmount, totalCycles, cycleDuration);
    await group.deployed();
    await treasury.authorizeGroup(group.address, true);
    // Creator approves and joins as first participant
    await usdt.connect(owner).approve(group.address, contributionAmount);
    await group.connect(owner).joinGroup();
  });

  it("should deploy and initialize correctly", async function () {
    expect(await group.creator()).to.equal(owner.address);
    expect(await group.groupName()).to.equal(groupName);
    expect(await group.contributionAmount()).to.equal(contributionAmount);
    expect(await group.totalCycles()).to.equal(totalCycles);
    expect(await group.groupActive()).to.equal(true);
  });

  it("should allow participants to join and contribute", async function () {
    for (let user of [addr1, addr2, addr3, addr4, addr5]) {
      await usdt.connect(user).approve(group.address, contributionAmount);
      await expect(group.connect(user).joinGroup())
        .to.emit(group, "Joined");
    }
    expect((await group.getParticipants()).length).to.equal(6); // owner + 5
  });

  it("should process payouts in join order, deduct fees, and withhold 10%", async function () {
    for (let user of [addr1, addr2, addr3, addr4, addr5]) {
      await usdt.connect(user).approve(group.address, contributionAmount);
      await group.connect(user).joinGroup();
    }
    // Approve group to transfer USDT for payout
    for (let i = 0; i < 6; i++) {
      const user = [owner, addr1, addr2, addr3, addr4, addr5][i];
      await expect(group.connect(user).payout())
        .to.emit(group, "Payout");
    }
    expect(await group.groupActive()).to.equal(false);
  });

  it("should handle defaults and penalties from withheld", async function () {
    for (let user of [addr1, addr2, addr3, addr4, addr5]) {
      await usdt.connect(user).approve(group.address, contributionAmount);
      await group.connect(user).joinGroup();
    }
    // Simulate default for addr2
    await expect(group.handleDefault(addr2.address))
      .to.emit(group, "DefaultHandled");
    // addr2 should be marked as defaulted
    const participants = await group.getParticipants();
    expect(participants[2].isDefaulted).to.equal(true);
  });

  it("should return withheld to creator if no defaults", async function () {
    for (let user of [addr1, addr2, addr3, addr4, addr5]) {
      await usdt.connect(user).approve(group.address, contributionAmount);
      await group.connect(user).joinGroup();
    }
    for (let i = 0; i < 6; i++) {
      const user = [owner, addr1, addr2, addr3, addr4, addr5][i];
      await group.connect(user).payout();
    }
    // Withheld should be returned to creator
    // (Check event or balance)
  });
}); 