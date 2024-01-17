# ZK Research

This repository contains some examples of various Circom and zkSNARK patterns and solutions with tests.

Do not use this in production, the project was made in learning and researching purposes.

For instantiating Circom circuits and building zkSNARK verification systems, [circomkit](https://github.com/erhant/circomkit) library was used.

## How to run

###### Running tests

```
npx hardhat test ./test/<example_name>.ts
```

###### Compiling circuits

```
npx circomkit compile <circuit_name>
```

**<circuit_name> from circuits.json file.*

###### Circuits setup

```
npx circomkit setup <circuit_name>
```
