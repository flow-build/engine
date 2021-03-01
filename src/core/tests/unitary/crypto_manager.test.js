const crypto_manager = require("../../crypto_manager");

describe("crypto_manager", () => {
    describe("buildCrypto", () => {
        const validCryptos = [
            {
                type: "",
                data: {
                    key: "12345678901234567890123456789012",
                },
                decrypt: true,
            },
        ];

        for (const validCrypto of validCryptos) {
            const test_name = `crypto for type ${validCrypto.type}`;
            test(`${test_name} is valid`, () => {
                const crypto = crypto_manager.buildCrypto(validCrypto.type, validCrypto.data);
                expect(crypto).toBeDefined();
                expect(crypto.encrypt).toBeInstanceOf(Function);
            });

            test(`${test_name} can encrypt number`, () => {
                const crypto = crypto_manager.buildCrypto(validCrypto.type, validCrypto.data);
                expect(crypto).toBeDefined();

                const response = crypto.encrypt(22);
                expect(response).toBeDefined();
            });

            if (validCrypto.decrypt) {
                test(`${test_name} have decrypt defined`, () => {
                    const crypto = crypto_manager.buildCrypto(validCrypto.type, validCrypto.data);
                    expect(crypto).toBeDefined();
                    expect(crypto.decrypt).toBeInstanceOf(Function);
                });

                test(`${test_name} can encrypt and decrypt`, () => {
                    const crypto = crypto_manager.buildCrypto(validCrypto.type, validCrypto.data);
                    expect(crypto).toBeDefined();
                    const data = "example fo data";

                    const encrypted = crypto.encrypt(data);
                    expect(encrypted).toBeDefined();

                    const result = crypto.decrypt(encrypted);
                    expect(result).toEqual(data);
                });

                test(`${test_name} can encrypt and decrypt number`, () => {
                    const crypto = crypto_manager.buildCrypto(validCrypto.type, validCrypto.data);
                    expect(crypto).toBeDefined();
                    const data = 22;

                    const encrypted = crypto.encrypt(data);
                    expect(encrypted).toBeDefined();

                    const result = crypto.decrypt(encrypted);
                    expect(result).toEqual(data.toString());
                });
            }
        }

        describe("defaultCrypto", () => {
            test("fails with invalid key under 32 bytes", () => {
                const key = "1234567890123456";
                expect(() => crypto_manager.buildCrypto("", { key })).toThrowError("Invalid key size");
            });

            test("fails with invalid key over 32 bytes", () => {
                const key = "123456789012345678901234567890121234567890";
                expect(() => crypto_manager.buildCrypto("", { key })).toThrowError("Invalid key size");
            });
        });
    });

    describe("crypto management", () => {
        beforeEach(() => {
            crypto_manager.setCrypto();
        });

        test("getCrypto error if not defined", () => {
            expect(
                () => crypto_manager.getCrypto()
            ).toThrowError("not defined");
        });

        test("getCrypto returns value passed on setCrypto", () => {
            const value = { a: 22 };
            crypto_manager.setCrypto(value);

            const result = crypto_manager.getCrypto();

            expect(result).toBe(value);
        });
    });
});