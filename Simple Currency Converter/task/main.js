const { createInterface } = require('node:readline/promises');

class RecoverableError extends Error {
    constructor(message) {
        super(message);
    }
}

class UnknownCurrencyError extends RecoverableError {
    constructor() {
        super('Unknown currency');
    }
}

class Communicator {
    constructor({ communicationInterface, currencyToUsdPriceMap }) {
        /** @private */
        this.communicationInterface = communicationInterface;
        /**
         * @private
         * @type {Record<string, number>}
         */
        this.currencyToUsdPriceMap = currencyToUsdPriceMap;
        /**
         * @private
         * @type {string[]}
         */
        this.knownCurrencies = Object.keys(this.currencyToUsdPriceMap);
    }

    /** @public */
    printIntroInfo() {
        console.log('Welcome to Currency Converter!');
        this.knownCurrencies.forEach((currencyName) => {
            console.log(`1 USD equals ${this.currencyToUsdPriceMap[currencyName]} ${currencyName}`);
        });
    }

    async askForCommand({ conversionFunction }) {
        const commandsData = {
            '1': {
                description: 'Convert currencies',
                action: async () => {
                    await conversionFunction(this);
                },
            },
            '2': {
                description: 'Exit program',
                action: async () => {
                    console.log('Have a nice day!')
                    process.exit(0);
                },
            },
        };

        while (true) {
            console.log('What do you want to do?');

            const commandsOptionsStr = Object.entries(commandsData)
                .reduce((acc, [command, commandData]) => {
                    return `${acc} ${command}-${commandData.description}`;
                }, '')
                .trim();
            const command = await this.communicationInterface.question(`${commandsOptionsStr}\n`);

            if (!Object.keys(commandsData).includes(command)) {
                console.log('Unknown input');
                continue;
            }

            await commandsData[command].action();
        }
    }

    /** @public */
    async askForCurrenciesToConvert() {
        const result = {};

        while (true) {
            console.log('What do you want to convert?');

            const currencyFrom = (await this.communicationInterface.question('From: ')).toUpperCase();

            if (!this.knownCurrencies.includes(currencyFrom)) {
                console.log('Unknown currency')
                continue;
            }

            result.currencyFrom = currencyFrom;
            break;
        }

        while (true) {
            const currencyTo = (await this.communicationInterface.question('To: ')).toUpperCase();

            if (!this.knownCurrencies.includes(currencyTo)) {
                console.log('Unknown currency')
                continue;
            }

            result.currencyTo = currencyTo;
            break;
        }

        return result;
    }

    /** @public */
    async askForAmountToConvert() {
        let result;

        while (true) {
            const amount = Number(await this.communicationInterface.question('Amount: '));

            if (isNaN(amount)) {
                console.log('The amount has to be a number');
                continue
            }

            if (amount < 1) {
                console.log('The amount cannot be less than 1');
                continue;
            }

            result = amount;
            break;
        }

        return result;
    }

    /** @public */
    printConversionResult({
        currencyFrom,
        currencyTo,
        initialAmount,
        convertedAmount,
    }) {
        console.log(`Result: ${initialAmount} ${currencyFrom} equals ${convertedAmount} ${currencyTo}`)
    }
}

const currencyToUsdPriceMap = {
    USD: 1,
    JPY: 113.5,
    EUR: 0.89,
    RUB: 74.36,
    GBP: 0.75,
};

async function proceedConversion(communicator) {
    try {
        const {
            currencyFrom,
            currencyTo,
        } = await communicator.askForCurrenciesToConvert();
        const amount = await communicator.askForAmountToConvert();
        const priceUsd = (currencyToUsdPriceMap.USD * currencyToUsdPriceMap[currencyFrom]);
        const convertedAmount = (currencyToUsdPriceMap[currencyTo] / priceUsd * amount).toFixed(4);

        communicator.printConversionResult({
            currencyFrom,
            currencyTo,
            initialAmount: amount,
            convertedAmount,
        });
    } catch (err) {
        if (err instanceof RecoverableError) {
            console.log(err.message)
            process.exit(1);
        }

        throw err;
    }
}

async function main() {
    const cliInterface = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const communicator = new Communicator({
        communicationInterface: cliInterface,
        currencyToUsdPriceMap,
    });

    communicator.printIntroInfo();
    await communicator.askForCommand({ conversionFunction: proceedConversion });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});
