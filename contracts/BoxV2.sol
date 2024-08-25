pragma solidity ^0.8.24;

import { Box } from "contracts/Box.sol";

contract BoxV2 is Box {
       function increment() public {
         setValue(getValue() + 1);
    }
}