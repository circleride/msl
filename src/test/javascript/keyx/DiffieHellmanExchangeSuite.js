/**
 * Copyright (c) 2012-2014 Netflix, Inc.  All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Diffie-Hellman key exchange unit tests.
 * 
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
xdescribe("DiffieHellmanExchangeSuite", function() {
    /** JSON key key exchange scheme. */
    var KEY_SCHEME = "scheme";
    /** JSON key key request data. */
    var KEY_KEYDATA = "keydata";
    
    /** JSON key Diffie-Hellman parameters ID. */
    var KEY_PARAMETERS_ID = "parametersid";
    /** JSON key Diffie-Hellman public key. */
    var KEY_PUBLIC_KEY = "publickey";
    
    /**
     * If the provided byte array begins with a null byte this function simply
     * returns the original array. Otherwise a new array is created that is a
     * copy of the original array with a null byte prepended, and this new array
     * is returned.
     * 
     * @param {Uint8Array} b the original array.
     * @return {Uint8Array} the resulting byte array.
     */
    function prependNullByte(b) {
        var result = b;
        if (result && result.length && result[0]) {
            result = new Uint8Array(b.length + 1);
            result[0] = 0x00;
            result.set(b, 1);
         }
         return result;
    }
    
    /** Diffie-Hellman parameters ID. */
    var PARAMETERS_ID = MockDiffieHellmanParameters$DEFAULT_ID;

    /** Random. */
    var random = new Random();
    /** MSL context. */
    var ctx;
    
    var REQUEST_PRIVATE_KEY, REQUEST_PUBLIC_KEY;
    var RESPONSE_PRIVATE_KEY, RESPONSE_PUBLIC_KEY;
    var MASTER_TOKEN;
    
    var initialized = false;
    beforeEach(function() {
    	if (!initialized) {
    	    runs(function() {
                MockMslContext$create(EntityAuthenticationScheme.PSK, false, {
                    result: function(c) { ctx = c; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
                
                var params = MockDiffieHellmanParameters$getDefaultParameters();
                var paramSpec = params.getParameterSpec(PARAMETERS_ID);
                
                MslTestUtils.generateDiffieHellmanKeys(paramSpec, {
                    result: function(publicKey, privateKey) {
                        REQUEST_PUBLIC_KEY = publicKey;
                        REQUEST_PRIVATE_KEY = privateKey;
                    },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
                MslTestUtils.generateDiffieHellmanKeys(paramSpec, {
                    result: function(publicKey, privateKey) {
                        RESPONSE_PUBLIC_KEY = publicKey;
                        RESPONSE_PRIVATE_KEY = privateKey;
                    },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return ctx && REQUEST_PUBLIC_KEY && REQUEST_PRIVATE_KEY && RESPONSE_PUBLIC_KEY && RESPONSE_PRIVATE_KEY; }, "ctx and DH keys", 100);
            
		    runs(function() {
		    	MslTestUtils.getMasterToken(ctx, 1, 1, {
		    		result: function(masterToken) {
		    			MASTER_TOKEN = masterToken;
		    		},
		    		error: function(e) { expect(function() { throw e; }).not.toThrow(); }
		    	});
		    });
		    waitsFor(function() { return MASTER_TOKEN; }, "static intialization", 100);
		    
		    runs(function() { initialized = true; });
    	}
    });
    
    // Shortcuts.
    var DhParameterSpec = DiffieHellmanExchange$DhParameterSpec;
    var RequestData = DiffieHellmanExchange$RequestData;
    var RequestData$parse = DiffieHellmanExchange$RequestData$parse;
    var ResponseData = DiffieHellmanExchange$ResponseData;
    var ResponseData$parse = DiffieHellmanExchange$ResponseData$parse;
    
    /** Request data unit tests. */
    describe("RequestData", function() {
        it("ctors", function() {
            var req = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            expect(req.keyExchangeScheme).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN);
            expect(req.parametersId).toEqual(PARAMETERS_ID);
            expect(req.privateKey.getEncoded()).toEqual(REQUEST_PRIVATE_KEY.getEncoded());
            expect(req.publicKey).toEqual(REQUEST_PUBLIC_KEY);
            var keydata = req.getKeydata();
            expect(keydata).not.toBeNull();
            
            var joReq;
            runs(function() {
                RequestData$parse(keydata, {
                    result: function(data) { joReq = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return joReq; }, "joReq not received", 100);
            
            runs(function() {
                expect(joReq.keyExchangeScheme).toEqual(req.keyExchangeScheme);
                expect(joReq.parametersId).toEqual(req.parametersId);
                expect(joReq.privateKey).toBeNull();
                expect(joReq.publicKey).toEqual(req.publicKey);
                var joKeydata = joReq.getKeydata();
                expect(joKeydata).not.toBeNull();
                expect(joKeydata).toEqual(keydata);
            });
        });
        
        it("json is correct", function() {
            var req = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var jo = JSON.parse(JSON.stringify(req));
            expect(jo[KEY_SCHEME]).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN.name);
            var keydata = jo[KEY_KEYDATA];
            expect(keydata[KEY_PARAMETERS_ID]).toEqual(PARAMETERS_ID);
            expect(prependNullByte(base64$decode(keydata[KEY_PUBLIC_KEY]))).toEqual(REQUEST_PUBLIC_KEY.getEncoded());
        });
        
        it("create", function() {
            var data = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var jsonString = JSON.stringify(data);
            var jo = JSON.parse(jsonString);
            var keyRequestData;
            runs(function() {
                KeyRequestData$parse(ctx, jo, {
                    result: function(data) { keyRequestData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyRequestData; }, "keyRequestData not received", 100);
            
            runs(function() {
                expect(keyRequestData).not.toBeNull();
                expect(keyRequestData instanceof RequestData).toBeTruthy();
                
                var joData = keyRequestData;
                expect(joData.keyExchangeScheme).toEqual(data.keyExchangeScheme);
                expect(joData.parametersId).toEqual(data.parametersId);
                expect(joData.privateKey).toBeNull();
                expect(joData.publicKey).toEqual(data.publicKey);
            });
        });
        
        it("missing parameters ID", function() {
            var f = function() {
	            var req = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            var keydata = req.getKeydata();
	            
	            expect(keydata[KEY_PARAMETERS_ID]).not.toBeNull();
	            delete keydata[KEY_PARAMETERS_ID];
	            
	            RequestData$parse(keydata);
            };
            expect(f).toThrow(new MslEncodingException(MslError.JSON_PARSE_ERROR));
        });
        
        it("missing public key", function() {
            var f = function() {
	            var req = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            var keydata = req.getKeydata();
	            
	            expect(keydata[KEY_PUBLIC_KEY]).not.toBeNull();
	            delete keydata[KEY_PUBLIC_KEY];
	            
	            RequestData$parse(keydata);
            };
            expect(f).toThrow(new MslEncodingException(MslError.JSON_PARSE_ERROR));
        });
        
        it("invalid public key", function() {
            var f = function() {
	            var req = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            var keydata = req.getKeydata();
	            
	            keydata[KEY_PUBLIC_KEY] = "x";
	            
	            RequestData$parse(keydata);
            };
            expect(f).toThrow(new MslKeyExchangeException(MslError.KEYX_INVALID_PUBLIC_KEY));
        });
        
        it("equals parameters ID", function() {
            var dataA = new RequestData(PARAMETERS_ID + "A", REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var dataB = new RequestData(PARAMETERS_ID + "B", REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var dataA2;
            runs(function() {
                RequestData$parse(dataA.getKeydata(), {
                    result: function(data) { dataA2 = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return dataA2; }, "dataA2 not received", 100);
            
            runs(function() {
                expect(dataA.equals(dataA)).toBeTruthy();
                expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
                
                expect(dataA.equals(dataB)).toBeFalsy();
                expect(dataB.equals(dataA)).toBeFalsy();
                expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
                
                // The private keys don't transfer via the JSON constructor.
                expect(dataA.equals(dataA2)).toBeFalsy();
                expect(dataA2.equals(dataA)).toBeFalsy();
                expect(dataA2.uniqueKey()).not.toEqual(dataA.uniqueKey());
            });
        });
        
        it("equals public key", function() {
            var dataA = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var dataB = new RequestData(PARAMETERS_ID, RESPONSE_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var dataA2;
            runs(function() {
                RequestData$parse(dataA.getKeydata(), {
                    result: function(data) { dataA2 = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return dataA2; }, "dataA2 not received", 100);
            
            runs(function() {
                expect(dataA.equals(dataA)).toBeTruthy();
                expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
                
                expect(dataA.equals(dataB)).toBeFalsy();
                expect(dataB.equals(dataA)).toBeFalsy();
                expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
                
                // The private keys don't transfer via the JSON constructor.
                expect(dataA.equals(dataA2)).toBeFalsy();
                expect(dataA2.equals(dataA)).toBeFalsy();
                expect(dataA2.uniqueKey()).not.toEqual(dataA.uniqueKey());
            });
        });
        
        it("equals private key", function() {
            var dataA = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var dataB = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, RESPONSE_PRIVATE_KEY);
            var dataA2;
            runs(function() {
                RequestData$parse(dataA.getKeydata(), {
                    result: function(data) { dataA2 = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return dataA2; }, "dataA2 not received", 100);
            
            runs(function() {
                expect(dataA.equals(dataA)).toBeTruthy();
                expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
                
                expect(dataA.equals(dataB)).toBeFalsy();
                expect(dataB.equals(dataA)).toBeFalsy();
                expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
                
                // The private keys don't transfer via the JSON constructor.
                expect(dataA.equals(dataA2)).toBeFalsy();
                expect(dataA2.equals(dataA)).toBeFalsy();
                expect(dataA2.uniqueKey()).not.toEqual(dataA.uniqueKey());
            });
        });
        
        it("equals object", function() {
            var data = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            expect(data.equals(null)).toBeFalsy();
            expect(data.equals(PARAMETERS_ID)).toBeFalsy();
        });
    });
    
    /** Response data unit tests. */
    describe("ResponseData", function() {
        /** JSON key master token. */
        var KEY_MASTER_TOKEN = "mastertoken";
        
        it("ctors", function() {
            var resp = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
            expect(resp.keyExchangeScheme).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN);
            expect(resp.parametersId).toEqual(PARAMETERS_ID);
            expect(resp.publicKey).toEqual(RESPONSE_PUBLIC_KEY);
            var keydata = resp.getKeydata();
            expect(keydata).not.toBeNull();
            
            var joResp = ResponseData$parse(MASTER_TOKEN, keydata);
            expect(joResp.keyExchangeScheme).toEqual(resp.keyExchangeScheme);
            expect(joResp.masterToken).toEqual(resp.masterToken);
            expect(joResp.parametersId).toEqual(resp.parametersId);
            expect(joResp.publicKey).toEqual(resp.publicKey);
            var joKeydata = joResp.getKeydata();
            expect(joKeydata).not.toBeNull();
            expect(joKeydata).toEqual(keydata);
        });
        
        it("json is correct", function() {
        	var masterToken = undefined, jo;
        	runs(function() {
        		var resp = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
        		jo = JSON.parse(JSON.stringify(resp));
        		expect(jo[KEY_SCHEME]).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN.name);

        		MasterToken$parse(ctx, jo[KEY_MASTER_TOKEN], {
        			result: function(token) { masterToken = token; },
        			error: function(e) { expect(function() { throw e; }).not.toThrow(); }
        		});
        	});
        	waitsFor(function() { return jo && masterToken; }, "json object and master token not received", 100);
        	runs(function() {
        		expect(masterToken).toEqual(MASTER_TOKEN);
        		var keydata = jo[KEY_KEYDATA];
        		expect(keydata[KEY_PARAMETERS_ID]).toEqual(PARAMETERS_ID);
        		expect(prependNullByte(base64$decode(keydata[KEY_PUBLIC_KEY]))).toEqual(RESPONSE_PUBLIC_KEY.getEncoded());
        	});
        });
        
        it("create", function() {
            var data = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
            
            var keyResponseData;
            runs(function() {
                var jsonString = JSON.stringify(data);
                var jo = JSON.parse(jsonString);
                KeyResponseData$parse(ctx, jo, {
                    result: function(data) { keyResponseData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyResponseData; }, "keyResponseData not received", 100);
            runs(function() {
	            expect(keyResponseData).not.toBeNull();
	            expect(keyResponseData instanceof ResponseData).toBeTruthy();
	            
	            var joData = keyResponseData;
	            expect(joData.keyExchangeScheme).toEqual(data.keyExchangeScheme);
	            expect(joData.masterToken).toEqual(data.masterToken);
	            expect(joData.parametersId).toEqual(data.parametersId);
	            expect(joData.publicKey).toEqual(data.publicKey);
            });
        });
        
        it("missing parameters ID", function() {
            var f = function() {
	            var resp = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
	            var keydata = resp.getKeydata();
	            
	            expect(keydata[KEY_PARAMETERS_ID]).not.toBeNull();
	            delete keydata[KEY_PARAMETERS_ID];
	            
	            ResponseData$parse(MASTER_TOKEN, keydata);
            };
            expect(f).toThrow(new MslEncodingException(MslError.JSON_PARSE_ERROR));
        });
        
        it("missing public key", function() {
            var f = function() {
	            var resp = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
	            var keydata = resp.getKeydata();
	            
	            expect(keydata[KEY_PUBLIC_KEY]).not.toBeNull();
	            delete keydata[KEY_PUBLIC_KEY];
	            
	            ResponseData$parse(MASTER_TOKEN, keydata);
            };
            expect(f).toThrow(new MslEncodingException(MslError.JSON_PARSE_ERROR));
        });
        
        it("invalid public key", function() {
            var f = function() {
	            var resp = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
	            var keydata = resp.getKeydata();
	            
	            keydata[KEY_PUBLIC_KEY] = "x";
	            
	            ResponseData$parse(MASTER_TOKEN, keydata);
            };
            expect(f).toThrow(new MslKeyExchangeException(MslError.KEYX_INVALID_PUBLIC_KEY));
        });
        
        it("equals master token", function() {
        	var masterTokenA = undefined, masterTokenB;
            runs(function() {
            	MslTestUtils.getMasterToken(ctx, 1, 1, {
            		result: function(token) { masterTokenA = token; },
            		error: function(e) { expect(function() { throw e; }).not.toThrow(); },
            	});
            	MslTestUtils.getMasterToken(ctx, 1, 2, {
            		result: function(token) { masterTokenB = token; },
            		error: function(e) { expect(function() { throw e; }).not.toThrow(); },
            	});
            });
            waitsFor(function() { return masterTokenA && masterTokenB; }, "master tokens not received", 100);
            
            runs(function() {
	            var dataA = new ResponseData(masterTokenA, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
	            var dataB = new ResponseData(masterTokenB, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
	            var dataA2 = ResponseData$parse(masterTokenA, dataA.getKeydata());
	            
	            expect(dataA.equals(dataA)).toBeTruthy();
	            expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
	            
	            expect(dataA.equals(dataB)).toBeFalsy();
	            expect(dataB.equals(dataA)).toBeFalsy();
	            expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
	            
	            expect(dataA.equals(dataA2)).toBeTruthy();
	            expect(dataA2.equals(dataA)).toBeTruthy();
	            expect(dataA2.uniqueKey()).toEqual(dataA.uniqueKey());
            });
        });
        
        it("equals parameter ID", function() {
            var dataA = new ResponseData(MASTER_TOKEN, PARAMETERS_ID + "A", RESPONSE_PUBLIC_KEY);
            var dataB = new ResponseData(MASTER_TOKEN, PARAMETERS_ID + "B", RESPONSE_PUBLIC_KEY);
            var dataA2 = ResponseData$parse(MASTER_TOKEN, dataA.getKeydata());
            
            expect(dataA.equals(dataA)).toBeTruthy();
            expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
            
            expect(dataA.equals(dataB)).toBeFalsy();
            expect(dataB.equals(dataA)).toBeFalsy();
            expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
            
            expect(dataA.equals(dataA2)).toBeTruthy();
            expect(dataA2.equals(dataA)).toBeTruthy();
            expect(dataA2.uniqueKey()).toEqual(dataA.uniqueKey());
        });
        
        it("equals public key", function() {
            var dataA = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
            var dataB = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, REQUEST_PUBLIC_KEY);
            var dataA2 = ResponseData$parse(MASTER_TOKEN, dataA.getKeydata());
            
            expect(dataA.equals(dataA)).toBeTruthy();
            expect(dataA.uniqueKey()).toEqual(dataA.uniqueKey());
            
            expect(dataA.equals(dataB)).toBeFalsy();
            expect(dataB.equals(dataA)).toBeFalsy();
            expect(dataB.uniqueKey()).not.toEqual(dataA.uniqueKey());
            
            expect(dataA.equals(dataA2)).toBeTruthy();
            expect(dataA2.equals(dataA)).toBeTruthy();
            expect(dataA2.uniqueKey()).toEqual(dataA.uniqueKey());
        });
        
        it("equals object", function() {
            var data = new ResponseData(MASTER_TOKEN, PARAMETERS_ID, RESPONSE_PUBLIC_KEY);
            expect(data.equals(null)).toBeFalsy();
            expect(data.equals(PARAMETERS_ID)).toBeFalsy();
        });
    });
    
    /** Key exchange factory unit tests. */
    describe("KeyExchangeFactory", function() {
        /**
         * Fake key request data for the Diffie-Hellman key exchange scheme.
         */
        var FakeKeyRequestData = KeyRequestData.extend({
            /** Create a new fake key request data. */
            init: function init() {
                init.base.call(this, KeyExchangeScheme.DIFFIE_HELLMAN);
            },

            /** @inheritDoc */
            getKeydata: function getKeydata() {
                return null;
            },
        });
        
        /**
         * Fake key response data for the Diffie-Hellman key exchange scheme.
         */
        var FakeKeyResponseData = KeyResponseData.extend({
            /** Create a new fake key response data. */
            init: function init() {
                init.base.call(this, MASTER_TOKEN, KeyExchangeScheme.DIFFIE_HELLMAN);
            },

            /** @inheritDoc */
            getKeydata: function getKeydata() {
                return null;
            },
        });

        /** Diffie-Hellman parameter specifications. */
	    var paramSpecs = {};
	    paramSpecs['1'] = new DhParameterSpec(new BigInteger('23', 10), new BigInteger('5', 10));
        
        /** Key exchange factory. */
        var factory = new DiffieHellmanExchange(paramSpecs);
        
        beforeEach(function() {
            ctx.getMslStore().clearCryptoContexts();
            ctx.getMslStore().clearServiceTokens();
        });
        
        it("factory", function() {
            expect(factory.scheme).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN);
        });
        
        it("generate initial response", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var keyxData;
            runs(function() {
                factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function(data) { keyxData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyxData; }, "keyxData not received", 100);
            runs(function() {
	            expect(keyxData).not.toBeNull();
	            expect(keyxData.cryptoContext).not.toBeNull();
	            expect(keyxData.keyResponseData).not.toBeNull();
	            
	            var keyResponseData = keyxData.keyResponseData;
	            expect(keyResponseData.keyExchangeScheme).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN);
	            var masterToken = keyResponseData.masterToken;
	            expect(masterToken).not.toBeNull();
	            expect(masterToken.identity).toEqual(MockPresharedAuthenticationFactory.PSK_ESN);
            });
        });
        
        it("generate initial response with wrong request type", function() {
            var exception;
            runs(function() {
	            var keyRequestData = new FakeKeyRequestData();
	            factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function() {},
                    error: function(err) { exception = err; }
                });
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslInternalException(MslError.NONE));
            });
        });
        
        it("generate initial response with invalid parameters ID", function() {
        	var exception;
            runs(function() {
	            var keyRequestData = new RequestData("x", REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function() {},
                    error: function(err) { exception = err; }
                });
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslKeyExchangeException(MslError.UNKNOWN_KEYX_PARAMETERS_ID));
            });
        });
        
        it("generate initial response with unknown parameters ID", function() {
        	var exception;
            runs(function() {
	            var keyRequestData = new RequestData('98765', REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function() {},
                    error: function(err) { exception = err; }
                });
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslKeyExchangeException(MslError.UNKNOWN_KEYX_PARAMETERS_ID));
            });
        });
        
        it("generate subsequent response", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var keyxData;
            runs(function() {
                factory.generateResponse(ctx, keyRequestData, MASTER_TOKEN, {
                    result: function(data) { keyxData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyxData; }, "keyxData not received", 100);
            runs(function() {
            	expect(keyxData).not.toBeNull();
            	expect(keyxData.cryptoContext).not.toBeNull();
            	expect(keyxData.keyResponseData).not.toBeNull();

            	var keyResponseData = keyxData.keyResponseData;
            	expect(keyResponseData.keyExchangeScheme).toEqual(KeyExchangeScheme.DIFFIE_HELLMAN);
            	var masterToken = keyResponseData.masterToken;
            	expect(masterToken).not.toBeNull();
            	expect(masterToken.identity).toEqual(MASTER_TOKEN.identity);
            	expect(masterToken.serialNumber).toEqual(MASTER_TOKEN.serialNumber);
            	expect(masterToken.sequenceNumber).toEqual(MASTER_TOKEN.sequenceNumber + 1);
            });
        });
        
        it("generate subsequent response with untrusted master token", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);

        	var masterToken;
        	runs(function() {
	            MslTestUtils.getUntrustedMasterToken(ctx, {
	            	result: function(token) { masterToken = token; },
	            	error: function(e) { expect(function() { throw e; }).not.toThrow(); },
	            });
        	});
        	waitsFor(function() { return masterToken; }, "master token not received", 100);
        	
            var exception;
            runs(function() {
	            factory.generateResponse(ctx, keyRequestData, masterToken, {
                    result: function() {},
                    error: function(err) { exception = err; }
                });
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslMasterTokenException(MslError.MASTERTOKEN_UNTRUSTED));
            });
        });
        
        it("generate subsequent response with wrong request type", function() {
            var exception;
            runs(function() {
	            var keyRequestData = new FakeKeyRequestData();
	            factory.generateResponse(ctx, keyRequestData, MASTER_TOKEN, {
                    result: function() {},
                    error: function(err) { exception = err; }
                });
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslInternalException(MslError.NONE));
            });
        });
        
        it("generate subsequent response with invalid parameters ID", function() {
            var exception;
            runs(function() {
            	var keyRequestData = new RequestData("x", REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            	factory.generateResponse(ctx, keyRequestData, MASTER_TOKEN, {
            		result: function() {},
            		error: function(err) { exception = err; }
            	});
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslKeyExchangeException(MslError.UNKNOWN_KEYX_PARAMETERS_ID));
            });
        });
        
        it("generate subsequent response with unknown parameters ID", function() {
            var exception;
            runs(function() {
            	var keyRequestData = new RequestData('98765', REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            	factory.generateResponse(ctx, keyRequestData, MASTER_TOKEN, {
            		result: function() {},
            		error: function(err) { exception = err; }
            	});
            });
            waitsFor(function() { return exception; }, "exception not received", 100);
            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslKeyExchangeException(MslError.UNKNOWN_KEYX_PARAMETERS_ID));
            });
        });
        
        it("get crypto context", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var keyxData;
            runs(function() {
                factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function(data) { keyxData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyxData; }, "keyxData not received", 100);
            
            var data = new Uint8Array(32);
            random.nextBytes(data);
            
            var requestCryptoContext = undefined, responseCryptoContext;
            runs(function() {
            	requestCryptoContext = keyxData.cryptoContext;
	            var keyResponseData = keyxData.keyResponseData;
	            factory.getCryptoContext(ctx, keyRequestData, keyResponseData, null, {
	            	result: function(cryptoContext) { responseCryptoContext = cryptoContext; },
	            	error: function(e) { expect(function() { throw e; }).not.toThrow(); }
	            });
            });
            waitsFor(function() { return requestCryptoContext && responseCryptoContext; }, "crypto contexts not received", 100);
            
            // Ciphertext won't always be equal depending on how it was
            // enveloped. So we cannot check for equality or inequality.
            var requestCiphertext = undefined, responseCiphertext;
            runs(function() {
                expect(responseCryptoContext).not.toBeNull();requestCryptoContext.encrypt(data, {
                    result: function(data) { requestCiphertext = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
                responseCryptoContext.encrypt(data, {
                    result: function(data) { responseCiphertext = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return requestCiphertext && responseCiphertext; }, "ciphertexts not received", 100);
            runs(function() {
            	expect(requestCiphertext).not.toEqual(data);
            	expect(responseCiphertext).not.toEqual(data);
            });

            // Signatures should always be equal.
            var requestSignature = undefined, responseSignature;
            runs(function() {
                requestCryptoContext.sign(data, {
                    result: function(data) { requestSignature = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
                responseCryptoContext.sign(data, {
                    result: function(data) { responseSignature = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return requestSignature && responseSignature; }, "signatures not received", 100);
            runs(function() {
	            expect(requestSignature).not.toEqual(data);
	            expect(responseSignature).not.toEqual(data);
	            expect(responseSignature).toEqual(requestSignature);
            });
            
            // Plaintext should always be equal to the original message.
            var requestPlaintext = undefined, responsePlaintext;
            runs(function() {
                requestCryptoContext.decrypt(responseCiphertext, {
                    result: function(data) { requestPlaintext = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
                responseCryptoContext.decrypt(requestCiphertext, {
                    result: function(data) { responsePlaintext = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return requestPlaintext && responsePlaintext; }, "plaintexts not received", 100);
            runs(function() {
	            expect(requestPlaintext).not.toBeNull();
	            expect(requestPlaintext).toEqual(data);
	            expect(responsePlaintext).toEqual(requestPlaintext);
            });
            
            // Verification should always succeed.
            var requestVerified; responseVerified = undefined;
            runs(function() {
            	requestCryptoContext.verify(data, responseSignature, {
            		result: function(data) { requestVerified = data; },
            		error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            	});
            	responseCryptoContext.verify(data, requestSignature, {
            		result: function(data) { responseVerified = data; },
            		error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            	});
            });
            waitsFor(function() { return requestVerified && responseVerified; }, "verifieds not received", 100);
            runs(function() {
	            expect(requestVerified).toBeTruthy();
	            expect(responseVerified).toBeTruthy();
            });
        });
        
        it("get crypto context with wrong request type", function() {
        	var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
        	var keyxData;
        	runs(function() {
        		factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
        			result: function(data) { keyxData = data; },
        			error: function(e) { expect(function() { throw e; }).not.toThrow(); }
        		});
        	});
        	waitsFor(function() { return keyxData; }, "keyxData not received", 100);
        	
        	var exception;
        	runs(function() {
	        	var keyResponseData = keyxData.keyResponseData;
	
	        	var fakeKeyRequestData = new FakeKeyRequestData();
	        	factory.getCryptoContext(ctx, fakeKeyRequestData, keyResponseData, null, {
	        		result: function() {},
	        		error: function(err) { exception = err; }
	        	});
        	});
        	waitsFor(function() { return exception; }, "exception not recevied", 100);

            runs(function() {
            	var f = function() { throw exception; };
            	expect(f).toThrow(new MslInternalException(MslError.NONE));
            });
        });
        
        it("get crypto context with wrong response type", function() {
        	var exception;
        	runs(function() {
	            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
	            var fakeKeyResponseData = new FakeKeyResponseData();
	            factory.getCryptoContext(ctx, keyRequestData, fakeKeyResponseData, null, {
	        		result: function() {},
	        		error: function(err) { exception = err; }
	        	});
        	});
        	waitsFor(function() { return exception; }, "exception not recevied", 100);
        	
        	runs(function() {
        		var f = function() { throw exception; };
        		expect(f).toThrow(new MslInternalException(MslError.NONE));
        	});
        });
        
        it("get crypto context with mismatched parameters ID", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, REQUEST_PRIVATE_KEY);
            var keyxData;
            runs(function() {
                factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function(data) { keyxData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyxData; }, "keyxData not received", 100);
            
        	var exception;
        	runs(function() {
	            var keyResponseData = keyxData.keyResponseData;
	            var masterToken = keyResponseData.masterToken;
	            
	            var mismatchedKeyResponseData = new ResponseData(masterToken, PARAMETERS_ID + "x", RESPONSE_PUBLIC_KEY);
	            
	            factory.getCryptoContext(ctx, keyRequestData, mismatchedKeyResponseData, null, {
	        		result: function() {},
	        		error: function(err) { exception = err; }
	        	});
        	});
        	waitsFor(function() { return exception; }, "exception not recevied", 100);
        	
        	runs(function() {
        		var f = function() { throw exception; };
        		expect(f).toThrow(new MslKeyExchangeException(MslError.KEYX_RESPONSE_REQUEST_MISMATCH));
        	});
        });
        
        it("get crypto context with missing private key", function() {
            var keyRequestData = new RequestData(PARAMETERS_ID, REQUEST_PUBLIC_KEY, null);
            var keyxData;
            runs(function() {
                factory.generateResponse(ctx, keyRequestData, MockPresharedAuthenticationFactory.PSK_ESN, {
                    result: function(data) { keyxData = data; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return keyxData; }, "keyxData not received", 100);

        	var exception;
        	runs(function() {
	            var keyResponseData = keyxData.keyResponseData;
	            
	            factory.getCryptoContext(ctx, keyRequestData, keyResponseData, null, {
	        		result: function() {},
	        		error: function(err) { exception = err; }
	        	});
        	});
        	waitsFor(function() { return exception; }, "exception not recevied", 100);
        	
        	runs(function() {
        		var f = function() { throw exception; };
        		expect(f).toThrow(new MslKeyExchangeException(MslError.KEYX_PRIVATE_KEY_MISSING));
        	});
        });
    });
});
