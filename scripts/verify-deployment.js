const fs = require("fs");
const { task } = require("hardhat/config");

task("verify-deployment", "Verifies the deployed contract bytecode")
  .setAction(async function (taskArgs, hre) {
    const network = hre.network.name;
    console.log(`Verifying contract bytecode on ${network}...`);

    const deploymentsFile = `deployments-${network}.json`;
    if (!fs.existsSync(deploymentsFile)) {
      console.error(`Deployments file not found: ${deploymentsFile}`);
      return;
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));

    for (const deployment of deployments) {
      console.log(`\nVerifying ${deployment.contractName} (${deployment.address}):`);
      try {
        console.log("  Reading contract artifact...");
        let artifactPath = `artifacts/contracts/${deployment.contractName}.sol/${deployment.contractName}.json`;
        
        if (!fs.existsSync(artifactPath)) {
          console.log("  Artifact not found. Compiling contracts...");
          await hre.run("compile");
          
          // Check again for the artifact after compilation
          if (!fs.existsSync(artifactPath)) {
            throw new Error(`Artifact not found even after compilation: ${artifactPath}`);
          }
        }
        console.log("--- Fetching deployed bytecode...");
        const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // storage slot
        const implementationAddress = hre.ethers.stripZerosLeft(
          await hre.ethers.provider.getStorage(deployment.address, implementationSlot)
        );
        console.log("implementationAddress:", implementationAddress)
        const deployedBytecode = await hre.ethers.provider.getCode(implementationAddress);

        console.log("--- Creating local Hardhat network...");
        const localHardhat = require("hardhat");
        await localHardhat.run("compile");

        console.log("--- Deploying contract locally...");
        const ContractFactory = await localHardhat.ethers.getContractFactory(deployment.contractName);
        const localContract = await localHardhat.upgrades.deployProxy(ContractFactory, [], { kind: "uups" });
        await localContract.waitForDeployment();
        const localAddress = await localContract.getAddress();

        console.log("--- Fetching local deployment bytecode...");
        const localImplementationAddress = await localHardhat.ethers.stripZerosLeft(
          await localHardhat.ethers.provider.getStorage(localAddress, implementationSlot)
        );
        const localBytecode = await localHardhat.ethers.provider.getCode(localImplementationAddress);

        console.log("--- Comparing bytecodes...");
        console.log("--- Deployed bytecode: ", deployedBytecode);
        console.log("--- Local bytecode: ", localBytecode);

        if (deployedBytecode === localBytecode) {
          console.log(`✅ ${deployment.contractName} (${deployment.address}): Bytecode verified successfully`);
        } else {
          console.log(`❌ ${deployment.contractName} (${deployment.address}): Bytecode mismatch`);
          throw new Error("Bytecode mismatch");
        }
      } catch (error) {
        console.log(`❌ ${deployment.contractName} (${deployment.address}): Verification failed`);
        console.error(`   Error: ${error.message}`);
      }
    }
  });
