export interface ZkProof {
    proof: {
        pi_a: [bigint, bigint],
        pi_b: [[bigint, bigint], [bigint, bigint]],
        pi_c: [bigint, bigint],
    }
    publicSignals: string[]
}