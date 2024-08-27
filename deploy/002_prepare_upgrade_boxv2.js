// deploy/002_prepare_boxv2_upgrade.js
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

const PROXY_ADDRESS = "0x44Df6cBCB8a1F4C3D9aF1452667731Ed552e8DAC";
async function main() {
    const proxy = await ethers.getContractAt("UUPSUpgradeable", PROXY_ADDRESS);
    const BoxV2 = await ethers.getContractFactory("BoxV2");
  console.log("Preparing upgrade to BoxV2...");

  const deploymentsFile = `deployments-${hre.network.name}.json`;
  let deployments = [];
  if (fs.existsSync(deploymentsFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  }

  const boxV2Address = await upgrades.prepareUpgrade(proxy, BoxV2, {kind:"uups"});
  console.log("BoxV2 implementation deployed to:", boxV2Address);

  const deployment = {
    address: boxV2Address,
    contractName: "BoxV2",
    network: hre.network.name,
    timestamp: Math.floor(Date.now() / 1000),
    isProxy: false,
    isImplementation: true,
    proxyAddress: PROXY_ADDRESS
  };

  deployments.push(deployment);

  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
}

module.exports = main;
module.exports.tags = ["prepare_upgrade_boxv2"];
