import { Circomkit } from "circomkit";
import { CircomkitConfigOverrides } from "circomkit/dist/types/circomkit";

import { loadFixture, reset, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

import "@nomicfoundation/hardhat-chai-matchers";

const getCircomkit = (overrides: CircomkitConfigOverrides = {}) => {
    const circomkitConfig = require("./circomkit.json");
    console.log(circomkitConfig);
    return new Circomkit({...circomkitConfig, ...overrides});
}

export { getCircomkit, loadFixture, ethers, expect, reset, time };
