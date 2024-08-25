const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const Box = await ethers.getContractFactory("Box");
  console.log("Deploying Box...");
  const box = await upgrades.deployProxy(Box, [], { kind: "uups" });
  await box.waitForDeployment();
  const address = await box.getAddress();
  console.log("Box deployed to:", address);

  const deployment = {
    address: address,
    contractName: "Box",
    network: hre.network.name,
    timestamp: Math.floor(Date.now() / 1000),
    isProxy: true,
    isImplementation: false
  };

  let deployments = [];
  const deploymentsFile = `deployments-${hre.network.name}.json`;
  if (fs.existsSync(deploymentsFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  }

  deployments.push(deployment);

  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
}

module.exports = main;
module.exports.tags = ["deploy_box"]