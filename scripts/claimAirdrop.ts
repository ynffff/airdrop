import { Address, Cell, Dictionary } from '@ton/core';
import { airdropEntryValue } from '../wrappers/Airdrop';
import { NetworkProvider, compile } from '@ton/blueprint';
import { AirdropHelper } from '../wrappers/AirdropHelper';

export async function run(provider: NetworkProvider) {
    // suppose that you have the cell in base64 form stored somewhere
    const dictCell = Cell.fromBase64(
        'te6cckEBBAEAXwACA8/oAgEAT0gAMaTLFayMrEKLtLGX2iP4b6/O5hnOfAtigQG4jGSkS8ii6Q7dABACASADAwBPIADGkyxWsjKxCi7Sxl9oj+G+vzuYZznwLYoEBuIxkpEvIoukO3QAQNR0vzk='
    );
    const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), airdropEntryValue);

    const entryIndex = 1n;

    const proof = dict.generateMerkleProof(entryIndex);

    const helper = provider.open(
        AirdropHelper.createFromConfig(
            {
                airdrop: Address.parse('EQCiBGfJ9xQMaDbwHgPYcWuxu_wDfnDy1BkW6Myf1a6DqMcf'),
                index: entryIndex,
                proofHash: proof.hash(),
            },
            await compile('AirdropHelper')
        )
    );

    if (!(await provider.isContractDeployed(helper.address))) {
        await helper.sendDeploy(provider.sender());
        await provider.waitForDeploy(helper.address);
    }

    await helper.sendClaim(123n, proof); // 123 -> any query_id
}
