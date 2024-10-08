// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {SupplyChainManagement} from "../src/SupplyChainManagement.sol";
import "forge-std/console.sol";

contract DeploySupplyChainManagement is Script {
    function run() external {
        vm.startBroadcast();
        SupplyChainManagement scm = new SupplyChainManagement();
        vm.stopBroadcast();

        // Output the deployed contract address
        console.log("Contract Address: %s", address(scm));
    }
}
