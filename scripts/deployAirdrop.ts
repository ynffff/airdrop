import { Address, beginCell, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary } from '../wrappers/Airdrop';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';

// Скрипт для деплоя смарт-контракта
// Лучше всего за один деплой смарт-контракта отправлять токены для 1000-10.000 юзерам потому что юзер забирает монеты на фронте для этого нужно сделать вычисление
// Короче  если юзеров много то всё тупо зависнет нахуй
// То есть придется деплоить несколько смарт-котрактов для каждой пачки юзеров, например: если в 1 контракте 1000 юзеров, то для 3000
// Нужно задеплоить 3 смарт-контракта, то есть три раза запустить скрипт
export async function run(provider: NetworkProvider) {
    // Запуск скрипта
    // Массив для аирдропа (Получаем из бд), для каждого юзера нужно сохранить в бд его индекс в этом массиве, индекс отдавать на фронт
    // Массив имеет такой вид [{address: "Адрес", amount: 100}, {address: "Адрес", amount: 100}, {address: "Адрес", amount: 100}]
    const entries: AirdropEntry[] = Array.from({length: 3}).map(() => ({
        address: Address.parse('0QAY0mWK1kZWIUXaWMvtEfw31-dzDOc-BbFAgNxGMlIl5IhM'), // Кошелек юзера
        amount: toNano("100"), // Количество монет
    }))

    const dict = generateEntriesDictionary(entries);
    const dictCell = beginCell().storeDictDirect(dict).endCell();
    
    // Очень важная строка, её нужно сохранять в бд и привязывать к юзеру
    // Если че: Если деплоем смарт контракт для 1000 юзеров, то у этой 1000 юзеров эта строка совпадает
    console.log(`Dictionary cell (store it somewhere on your backend: ${dictCell.toBoc().toString('base64')}`); // Важная строка

    const merkleRoot = BigInt('0x' + dictCell.hash().toString('hex'));

    // Здесь нужен адрес токена который раздаем, у каждого токена в TON свой адрес
    // у USDT свой, у HAMSTERA свой
    // Из бд либо из dotenv наверное будем получать этот адрес
    // EQAurRmpttEmFb34RAHDinfJ2Mp8AXmmMFgTuzMy8p-d6xJl - адрес токена
    const jettonMinterAddress = Address.parse('EQAurRmpttEmFb34RAHDinfJ2Mp8AXmmMFgTuzMy8p-d6xJl');

    const jettonMinter = provider.open(JettonMinter.createFromAddress(jettonMinterAddress));

    const airdrop = provider.open(
        Airdrop.createFromConfig(
            {
                merkleRoot,
                helperCode: await compile('AirdropHelper'),
            },
            await compile('Airdrop')
        )
    );
    
    // У каждого смарт-контракта в TON тоже есть свой адрес
    // Если че: Если деплоем смарт контракт для 1000 юзеров, то у этой 1000 юзеров адрес смарт-контракта совпадает
    // Здесь прописываем логику сохранения адреса смарт-контракта в бд, привязываем этот адрес к юзеру, его тоже отдавать нужно на фронт

    await airdrop.sendDeploy(provider.sender(), toNano('0.05'), await jettonMinter.getWalletAddressOf(airdrop.address));

    await provider.waitForDeploy(airdrop.address);

    // run methods on `airdrop`
}
