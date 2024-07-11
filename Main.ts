import Web3 from 'web3';
import BigNumber from 'bignumber.js';

// Подключение к Ethereum через Infura
const web3 = new Web3('https://eth-pokt.nodies.app');

// Импорт ABI из файлов JSON
const UNISWAP_V2_FACTORY_ABI = require('./UniswapV2FactoryABI.json');
const UNISWAP_V2_PAIR_ABI = require('./UniswapV2PairABI.json');

// Адрес контракта Factory Uniswap V2
const factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
// Адреса токенов WETH и USDT
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; //
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; //
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; //

interface Reserves {
    _reserve0: number;
    _reserve1: number;
}
// Определение типа для хранения десятичных знаков токенов
interface TokenDecimals {
    [key: string]: number;
}

const TOKEN_DECIMALS: TokenDecimals = {
    [WETH]: 18,
    [USDT]: 6,
    [DAI]: 18
};

// Функция для получения адреса пула
const getPoolAddress = async (tokenA: string, tokenB: string): Promise<string> => {
    const factoryContract = new web3.eth.Contract(UNISWAP_V2_FACTORY_ABI, factoryAddress);
    return await factoryContract.methods.getPair(tokenA, tokenB).call();
};


// Функция для получения цены из пула
const getPoolPrice = async (poolAddress: string, tokenA: string, tokenB: string): Promise<BigNumber> => {
    const poolContract = new web3.eth.Contract(UNISWAP_V2_PAIR_ABI, poolAddress);
    const reserves: Reserves = await poolContract.methods.getReserves().call();
    const token0: string = await poolContract.methods.token0().call();

    let reserveA: BigNumber, reserveB: BigNumber;
    if (token0.toLowerCase() === tokenA.toLowerCase()) {
        reserveA = new BigNumber(reserves._reserve0);
        reserveB = new BigNumber(reserves._reserve1);
    } else {
        reserveA = new BigNumber(reserves._reserve1);
        reserveB = new BigNumber(reserves._reserve0);
    }

    // Нормализация десятичных разрядов
    reserveA = reserveA.shiftedBy(-TOKEN_DECIMALS[tokenA]);
    reserveB = reserveB.shiftedBy(-TOKEN_DECIMALS[tokenB]);

    return reserveB.dividedBy(reserveA);
};

// Функция для сравнения цен и вывода результатов
const comparePrices = async (): Promise<void> => {
    const pool1Address = await getPoolAddress(WETH, USDT);
    const pool2Address = await getPoolAddress(WETH, DAI); // Замените на другой пул, если нужно

    console.log(`Адрес пула 1: ${pool1Address}`);
    console.log(`Адрес пула 2: ${pool2Address}`);

    const price1: BigNumber = await getPoolPrice(pool1Address,WETH,USDT);
    const price2: BigNumber = await getPoolPrice(pool2Address,WETH,DAI);

    console.log(`Цена WETH в USDT: ${price1.toString()} `);
    console.log(`Цена WETH в DAI: ${price2}`);

    // Вычисление средней цены
    const averagePrice: BigNumber = price1.plus(price2).div(2);

    // Вычисление разницы в цене
    const priceDifference: BigNumber = price1.minus(price2).div(averagePrice).multipliedBy(100);

    console.log(`Разница в цене: ${priceDifference.toFixed(2)}%`);

    if (priceDifference.abs().gt(0.5)) {
        console.log('Возможна арбитражная возможность!');
    }
};

comparePrices().catch(console.error);
