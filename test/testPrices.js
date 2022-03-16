const BigNumber = require('bignumber.js');
const fs = require('fs');
const { expect } = require("chai");
const fetch = require('node-fetch')

var accounts;
var ProsperoPricesJson =require('../artifacts/contracts/ProsperoPrices.sol/ProsperoPrices.json')
var ProsperoPricesGasCostJson =require('../artifacts/contracts/ProsperoPricesGasCost.sol/ProsperoPricesGasCost.json')
var ERCExtendedJson =require("../artifacts/contracts/IERC20Extended.sol/IERC20Extended.json");
var topTokensPng = JSON.parse(fs.readFileSync('topTokensPng.json', 'utf8'))
topTokensPng=topTokensPng['data']['tokens'];
var tokens = JSON.parse(fs.readFileSync('TokensMainnet.json', 'utf8'))
var WAVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
var CRA = "0xa32608e873f9ddef944b24798db69d80bbb4d1ed"//https://info.pangolin.exchange/#/token/0xa32608e873f9ddef944b24798db69d80bbb4d1ed
var GB = "0x90842eb834cfd2a1db0b1512b254a18e4d396215"
var BTC = "0x50b7545627a5162F82A992c33b87aDc75187B218"
var USD_SCALE;
var prosperoPricesGasCostAddress;
var prosperoPricesAddress;
//Price Feeds:
//https://docs.chain.link/docs/avalanche-price-feeds/
before(async function () {
  console.log('Deploying ProsperoPrices and contract for checking gas cost.')
  accounts = await ethers.getSigners();
  await deployProsperoPrices();
  await deloyProsperoPriceGasCost();

});

describe("Prospero Prices", async function () {
  describe("Getting Prices", function () {
    it("Should get a chainlink price of random tokens not on chainlink > 0.", async function () {
      var price = await getPrice(CRA);
      console.log('price of cra token:',formatUsd(price))
      var priceIsGreaterThanZero = isNumGreaterThanZero(price);
      expect(priceIsGreaterThanZero).to.equal(true);
      price = await getPrice(GB);
      console.log('price of gb token:',formatUsd(price))//tests with token with less than 16 decimals
      priceIsGreaterThanZero = isNumGreaterThanZero(price);
      expect(priceIsGreaterThanZero).to.equal(true);
      //0x7bf4ca9aec25adaaf7278eedbe959d81893e314f
      console.log("token with not enough liq:")
      price = await getPrice("0x7bf4ca9aec25adaaf7278eedbe959d81893e314f");
      priceIsGreaterThanZero = isNumGreaterThanZero(price);
      expect(priceIsGreaterThanZero).to.equal(false);
      //Uncomment to see difference in price of tokens on coingecko and prospero pricing contract.
      //this.timeout(1000000) // 30 second timeout
      //await printTokenPrices();
    });
  });
});



async function printTokenPrices(){
  for (var i =0;i<topTokensPng.length;i++){
    var tokenAddress=topTokensPng[i].id
    var priceProspero = await getPrice(tokenAddress);
    console.log(' ** Token:'+topTokensPng[i]['name']+" **")
    console.log("ProsperoPricing Price:"+formatUsd(priceProspero))
    var priceFromCoinGecko = await getCoingeckoPrice(tokenAddress);
    console.log("Coingecko Price      :"+priceFromCoinGecko)
    if ((Number(priceProspero+"")!=0) && (Number(priceFromCoinGecko+"")!=0)){
      var priceDiff = Math.abs(Number(priceFromCoinGecko+"")-Number(formatUsd(priceProspero)+""))
      console.log("% Diff               :"+(priceDiff/Number(priceFromCoinGecko+"")))
    }
  }
}

async function getCoingeckoPrice(tokenAddress){
  var cgUrl =
  "https://api.coingecko.com/api/v3/simple/token_price/avalanche?contract_addresses="
  + tokenAddress
  +"&vs_currencies=usd"
  //console.log('cgUrl:'+cgUrl)
  var pricesResponse = await fetch(cgUrl);
  var cgPrice=await pricesResponse.json();
  //coingeckoPricesAndMarketCaps_all =await pricesResponse.json();
  //console.log('theseCGPrices:'+JSON.stringify(theseCGPrices,null,2))
  if (cgPrice.hasOwnProperty(tokenAddress)){
    if ((cgPrice[tokenAddress]).hasOwnProperty("usd")){
      return cgPrice[tokenAddress]['usd']
    }
  }
  return 0;
//https://api.coingecko.com/api/v3/simple/token_price/avalanche?contract_addresses=0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB&vs_currencies=usd
//{
//  "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": {
//    "usd": 2732.37
//  }
}


async function printGasCosts(){
  var prosperoPricesGasCost = new web3.eth.Contract(
    ProsperoPricesGasCostJson.abi,
    prosperoPricesGasCostAddress
  );
  //console.log("tokenAddressToPriceFeeds:"+tokenAddressToPriceFeeds)
  //console.log("chainLinkPriceFeeds:"+chainLinkPriceFeeds)
  for (var i =0;i<topTokensPng.length;i++){
    var web3Tx = await prosperoPricesGasCost.methods.getGasCost(
      prosperoPricesAddress,
      topTokensPng[i].id
    ).call();
  }
}

async function getGasCostOfCallingPrices(tokenAddress){
  var prosperoPricesGasCost = new web3.eth.Contract(
    ProsperoPricesGasCostJson.abi,
    prosperoPricesGasCostAddress
  );
  var web3Tx = await prosperoPricesGasCost.methods.getGasCost(
    prosperoPricesAddress,
    tokenAddress
  ).call();
}

function formatUsd(amount){
  //var bal16=await formatBalanceTo16Decimals(amount, tokenAddress);
  var usd = amount/(USD_SCALE)
  return usd;
}

async function formatBalanceTo16Decimals(amount, tokenAddress){
  tokenAddress=tokenAddress.toLowerCase();
  var bnAmount = BigNumber(amount+"");

  //console.log("DApp.tokens--"+JSON.stringify(DApp.tokens,null,2))
  for (var i =0;i<tokens.length;i++){
    var thisToken = tokens[i]
    var address = (thisToken.address).toLowerCase()
    if (address == tokenAddress){
      //console.log("matched address");
      //console.log("amt:"+bnAmount);
      var dec = BigNumber((tokens[i]['decimals'])+"");
      //console.log("dec:"+dec);
      var bnTen = BigNumber(10+"");
      var multiplier = bnTen.exponentiatedBy(dec);
      multiplier = BigNumber(multiplier+"");
      var newAmt = bnAmount.dividedBy(multiplier);
      return newAmt;
    }
  }

  var dec = await getDecimals(tokenAddress)
  var bnTen = BigNumber(10+"");
  //console.log("bt:"+bnTen)
  var multiplier = bnTen.exponentiatedBy(dec);
  //console.log("multiplier:"+multiplier)

  multiplier = BigNumber(multiplier+"");
  var newAmt = bnAmount.dividedBy(multiplier);
  return newAmt;

}

async function getDecimals(tokenAddress){
  var tokenInst= new web3.eth.Contract(
    ERCExtendedJson.abi,
    tokenAddress
  );
  var decimals = await tokenInst.methods.decimals().call({from: accounts[0].address})
  //console.log('decimals:'+decimals);
  return decimals

}
async function getName(tokenAddress){
  var tokenInst= new web3.eth.Contract(
    ERCExtendedJson.abi,
    tokenAddress
  );
  var name = await tokenInst.methods.name().call({from: accounts[0].address})
  return name

}


function isNumGreaterThanZero(num){
  var bnNum = BigInt(num+"");
  var bnZero = BigInt(0+"")
  if (bnNum > bnZero){
    return true;
  }
  return false;
}

async function getPrice(tokenAddress){
  //console.log('getting price for:'+tokenAddress);
  prosperoPrices = new web3.eth.Contract(
    ProsperoPricesJson.abi,
    prosperoPricesAddress
  );

  var price = await prosperoPrices.methods.getPrice(tokenAddress).call();
  return price;

}
async function deloyProsperoPriceGasCost(){
  var web3Tx;
  var cumulativeGasUsed;
  var effectiveGasPrice;
  var gasUsed;

  var ProsperoPricesGasCostFactory = await ethers.getContractFactory("ProsperoPricesGasCost");
  prosperoPricesGasCost = new web3.eth.Contract(
    ProsperoPricesGasCostJson.abi
  );
  prosperoPricesGasCost.defaultAccount=accounts[0].address
  prosperoPricesGasCost = await prosperoPricesGasCost.deploy(
    {
      data:ProsperoPricesGasCostFactory.bytecode
    }
  ).send({
    from: accounts[0].address
  }).on('error', function(error, receipt){
    console.log("error:"+error)
  })
  .on('transactionHash', function(transactionHash){
    //console.log("transactionhash:"+transactionHash)
  })
  .on('receipt', function(receipt){
    prosperoPricesGasCostAddress=receipt.contractAddress;
    //console.log("prosperoPricesGasCostAddress:"+prosperoPricesGasCostAddress)
    cumulativeGasUsed=receipt.cumulativeGasUsed;
    effectiveGasPrice=receipt.effectiveGasPrice
    //console.log(receipt.contractAddress) // contains the new contract address
  })
  .on('confirmation', function(confirmationNumber, receipt){
    //console.log("receipt conf:"+JSON.stringify(receipt,null,2))
  })
}
async function deployProsperoPrices(){
  var web3Tx;
  var cumulativeGasUsed;
  var effectiveGasPrice;
  var gasUsed;

  var ProsperoPricesFactory = await ethers.getContractFactory("ProsperoPrices");
  prosperoPrices = new web3.eth.Contract(
    ProsperoPricesJson.abi
  );
  prosperoPrices.defaultAccount=accounts[0].address
  prosperoPrices = await prosperoPrices.deploy(
    {
      data:ProsperoPricesFactory.bytecode
    }
  ).send({
    from: accounts[0].address
  }).on('error', function(error, receipt){
    console.log("error:"+error)
  })
  .on('transactionHash', function(transactionHash){
    //console.log("transactionhash:"+transactionHash)
  })
  .on('receipt', function(receipt){
    prosperoPricesAddress=receipt.contractAddress;
    //console.log("ProsperoPricesAddress:"+prosperoPricesAddress)
    cumulativeGasUsed=receipt.cumulativeGasUsed;
    effectiveGasPrice=receipt.effectiveGasPrice
    //console.log(receipt.contractAddress) // contains the new contract address
  })
  .on('confirmation', function(confirmationNumber, receipt){
    //console.log("receipt conf:"+JSON.stringify(receipt,null,2))
  })
  //gasUsed = await calculateGasEstimate(cumulativeGasUsed, effectiveGasPrice);
  //console.log("gasUsed:"+JSON.stringify(gasUsed,null,2))
  var chainLinkPriceFeeds=[]
  var tokenAddressToPriceFeeds=[]
  for (var i =0;i<tokens.length;i++){
    if (tokens[i].hasOwnProperty('chainlinkAddress')){
      chainLinkPriceFeeds.push(tokens[i].chainlinkAddress)
      tokenAddressToPriceFeeds.push(tokens[i].address)
    }else{
    }
  }
  prosperoPrices = new web3.eth.Contract(
    ProsperoPricesJson.abi,
    prosperoPricesAddress
  );
  var web3Tx = await prosperoPrices.methods.initialize(
    tokenAddressToPriceFeeds,
    chainLinkPriceFeeds
  ).send({
    from: accounts[0].address
  }).on('error', function(error, receipt){
    console.log("error:"+error)
  })
  .on('transactionHash', function(transactionHash){
  })
  .on('receipt', function(receipt){
  })
  .on('confirmation', function(confirmationNumber, receipt){
  })

  USD_SCALE = await prosperoPrices.methods.USD_SCALE().call();
}

//Only get prices for tokens NOT on chainlink and have market cap > 0;
async function calculateGasEstimate (gasEstimate, gasPriceToUse){
  var estimatedGasBigNumber = BigNumber(gasEstimate+"")
  var gasPrice=await web3.eth.getGasPrice();
  var estimatedGasCostWei = estimatedGasBigNumber.multipliedBy(gasPrice);
  var estimatedCostInEth=ethers.utils.formatEther(estimatedGasCostWei+"")
  return {
    estimatedGasCostWei:estimatedGasCostWei,
    estimatedCostInEth:estimatedCostInEth
  }
}
