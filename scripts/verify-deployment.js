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
          
          if (!fs.existsSync(artifactPath)) {
            throw new Error(`Artifact not found even after compilation: ${artifactPath}`);
          }
        }

        console.log("--- Fetching deployed bytecode...");
        let deployedBytecode;
        const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
        if (deployment.isProxy) {
          const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(deployment.address);
          console.log("implementationAddress:", implementationAddress);
          deployedBytecode = await hre.ethers.provider.getCode(implementationAddress);
        } else {
          deployedBytecode = await hre.ethers.provider.getCode(deployment.address);
        }

        console.log("--- Creating local Hardhat network...");
        const localHardhat = require("hardhat");
        await localHardhat.run("compile");

        console.log("--- Deploying contract locally...");
        const ContractFactory = await localHardhat.ethers.getContractFactory(deployment.contractName);
        let localAddress;
        if (deployment.isProxy) {
          localContract = await localHardhat.upgrades.deployProxy(ContractFactory, [], { kind: "uups" });
          localAddress = localContract.getAddress();
        } else if (deployment.isImplementation) {
          localContract = await localHardhat.upgrades.deployImplementation(ContractFactory);
          localAddress = localContract;
        } else {
          localContract = await ContractFactory.deploy(...deployment.args);
        }

        console.log("--- Fetching local deployment bytecode...");
        let localBytecode;
        if (deployment.isProxy) {
          const localImplementationAddress = localHardhat.ethers.getAddress(
            localHardhat.ethers.dataSlice(await localHardhat.ethers.provider.getStorage(localAddress, implementationSlot), 12)
          );
          localBytecode = await localHardhat.ethers.provider.getCode(localImplementationAddress);
        } else {
          localBytecode = await localHardhat.ethers.provider.getCode(localAddress);
        }
        
        console.log("--- Comparing bytecodes...");
        // console.log("--- Deployed bytecode: ", deployedBytecode);
        // console.log("--- Local bytecode: ", localBytecode);

        if (hre.ethers.keccak256(deployedBytecode) === hre.ethers.keccak256(localBytecode)) {
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
