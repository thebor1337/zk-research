import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
        {
            version: "0.8.0"
        },
        {
            version: "0.8.19"
        },
        {
            version: "0.8.20"
        }
    ]
  },
};

export default config;
