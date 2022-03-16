pragma solidity 0.8.7;
// SPDX-License-Identifier: Prospero License;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/interfaces/IPangolinRouter.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-core/interfaces/IPangolinFactory.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-core/interfaces/IPangolinPair.sol";
import "./IERC20Extended.sol";
import "hardhat/console.sol";

contract ProsperoPrices is Initializable {

  address private constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
  address private constant WAVAX_CHAINLINK = 0x0A77230d17318075983913bC2145DB16C7366156;
  address private constant USDC = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;
  address private constant USDC_CHAINLINK = 0xF096872672F44d6EBA71458D74fe67F9a77a23B9;
  address private constant ETHEREUM = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB;
  address private constant ETHEREUM_CHAINLINK = 0x976B3D034E162d8bD72D6b9C989d545b839003b0;
  uint256 private constant NUMBER_OF_CHAINLINK_HELPER_TOKENS=3;
  uint256 public constant USD_SCALE   =     1000000000000000000; // same as 1 eth
  uint256 private constant CHAINLINK_SCALE_DIFF = 10; 
  address private constant PANGOLIN_ROUTER_ADDRESS=0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106;
  address private constant PANGOLIN_FACTORY_ADDRESS=0xefa94DE7a4656D787667C749f7E1223D71E9FD88;
  uint256 private constant MINIMUM_LIQUIDITY_REQUIRED = 1000;//in USD
  mapping(address => AggregatorV3Interface) private chainLinkPriceFeeds;

  function initialize(
    address[] memory _tokenAddressToPriceFeeds,
    address[] memory _chainLinkPriceFeeds
  ) public initializer {
    for (uint256 i = 0; i < _tokenAddressToPriceFeeds.length; i++) {
      AggregatorV3Interface thisChailinkInterface = AggregatorV3Interface(_chainLinkPriceFeeds[i]);
      chainLinkPriceFeeds[_tokenAddressToPriceFeeds[i]] = thisChailinkInterface;
    }
  }

  //These tokens have to be on chainlink
  function getHelperToken(uint256 i) private pure returns(address){
    if(i==0){
      return WAVAX;
    }else if (i==1){
      return USDC;
    }else if (i==2){
      return ETHEREUM;
    }else{
      return(0x0000000000000000000000000000000000000000);
    }
  }
  function getHelperTokensChainlinkAddress(uint256 i) private pure returns(address){
    if(i==0){
      return WAVAX_CHAINLINK;
    }else if (i==1){
      return USDC_CHAINLINK;
    }else if (i==2){
      return ETHEREUM_CHAINLINK;
    }
  }

  function getChainlinkAddressForAddress(address token) private pure returns(address){
    if(token==WAVAX){
      return WAVAX_CHAINLINK;
    }else if (token==USDC){
      return USDC_CHAINLINK;
    }else if (token==ETHEREUM){
      return ETHEREUM_CHAINLINK;
    }else{
      return(0x0000000000000000000000000000000000000000);
    }
  }

  //Gets prices for tokens in an array
  function getPrices(address[] calldata tokenAddresses) public view returns (uint256[] memory prices){
    prices = new uint256[](tokenAddresses.length);
    for (uint i =0;i<tokenAddresses.length;i++){
      prices[i]=getPrice(tokenAddresses[i]);
    }
    return (prices);
  }


  //Gets price for one token using chainlink price feeds in getChainlinkAddressForAddress function (to use a mapping with more chainlink pricefeeds use getPriceWithChainlinkMappingAsFallback).
  //If a chainlink price fee does not exists, it uses Pangolin's getAmountsOut on helper tokens like wavax to estimate the price.
  //If sufficiant liquidity does not exist for the helper token pair, then it will not return the price.
  function getPrice(address tokenAddress) public view returns (uint256){

    bool shouldUseCache=false;
    address chainlinkAddress=getChainlinkAddressForAddress(tokenAddress);
    if  (chainlinkAddress!=address(0x0000000000000000000000000000000000000000)){
      uint256 gasStart = gasleft();
      (,int256 price,,,)=AggregatorV3Interface(chainlinkAddress).latestRoundData();
      uint256 priceScaled = (10 ** CHAINLINK_SCALE_DIFF) * uint256(price);
      if (priceScaled>0){
        return priceScaled;
      }
    }
    //get price of wavax and get price of tokenAddress in terms of wavax on pangolin
    for (uint256 i=0;i<NUMBER_OF_CHAINLINK_HELPER_TOKENS;i++){
      address helperToken = getHelperToken(i);
      address chainlinkAddress=getHelperTokensChainlinkAddress(i);
      (,int256 price,,,) = AggregatorV3Interface(chainlinkAddress).latestRoundData();
      address[] memory thisPath=new address[](2);
      thisPath[0] = tokenAddress;
      thisPath[1]=  helperToken;
      (uint reserve0, uint reserve1) = getReservesPangolin(thisPath[0], thisPath[1]);
      if (reserve0!=0 && reserve1!=0){
        uint256 priceScaled = (10 ** CHAINLINK_SCALE_DIFF) * uint256(price);
        uint256 valueOfLiquidityOfHelper= (
          (
            (uint256(reserve1) * priceScaled)
            /
            (10**(IERC20Extended(thisPath[1]).decimals()))
          )
        );
        if (valueOfLiquidityOfHelper < (MINIMUM_LIQUIDITY_REQUIRED * USD_SCALE)){
        }else{
          try
          IPangolinRouter(PANGOLIN_ROUTER_ADDRESS).getAmountsOut((10**(IERC20Extended(tokenAddress).decimals())), thisPath)
          returns (uint256[] memory amounts) {
            if (amounts[amounts.length - 1]>0){
            uint256 estimatedPriceOfToken = ((amounts[amounts.length - 1] * priceScaled) / (10**(IERC20Extended(thisPath[1]).decimals())));
            if (estimatedPriceOfToken >0){
              return estimatedPriceOfToken;
            }
          }
          } catch Error(string memory reason) {
          } catch (bytes memory reason) {
          }
        }
      }
    }
    //optionally can make function revert if no price is found.
    //require(false, "Not enough liquidity found for token in getPrice.");
    return 0;
  }

  //Gets price for one token using chainlink price feeds that is uploaded upon contract deployment
  //If a chainlink price fee does not exists, it uses Pangolin's getAmountsOut on helper tokens like wavax to estimate the price.
  //If sufficiant liquidity does not exist for the helper token pair, then it will not return the price.
  function getPriceWithChainlinkMappingAsFallback(address tokenAddress) public view returns (uint256){
    if  (address(chainLinkPriceFeeds[tokenAddress])!=address(0x0000000000000000000000000000000000000000)){
      (,int256 price,,,)=chainLinkPriceFeeds[tokenAddress].latestRoundData();
      uint256 priceScaled = (10 ** CHAINLINK_SCALE_DIFF) * uint256(price);
      if (priceScaled>0){
        return priceScaled;
      }
    }
    //get price of wavax and get price of tokenAddress in terms of wavax on pangolin
    for (uint256 i=0;i<NUMBER_OF_CHAINLINK_HELPER_TOKENS;i++){
      address helperToken = getHelperToken(i);
      (,int256 price,,,) = chainLinkPriceFeeds[helperToken].latestRoundData();
      address[] memory thisPath=new address[](2);
      thisPath[0] = tokenAddress;
      thisPath[1]=  helperToken;
      (uint reserve0, uint reserve1) = getReservesPangolin(thisPath[0], thisPath[1]);
      uint256 priceScaled = (10 ** CHAINLINK_SCALE_DIFF) * uint256(price);
      uint256 valueOfLiquidityOfHelper= (
        (
          (uint256(reserve1) * priceScaled)
          /
          (10**(IERC20Extended(thisPath[1]).decimals()))
        )
      );
      if (valueOfLiquidityOfHelper < (MINIMUM_LIQUIDITY_REQUIRED * USD_SCALE)){
      }else{
        try
        IPangolinRouter(PANGOLIN_ROUTER_ADDRESS).getAmountsOut((10**(IERC20Extended(tokenAddress).decimals())), thisPath)
        returns (uint256[] memory amounts) {
          uint256 estimatedPriceOfToken = ((amounts[amounts.length - 1] * priceScaled) / (10**(IERC20Extended(thisPath[1]).decimals())));
          if ((amounts[amounts.length - 1]>0) && (estimatedPriceOfToken >0)){
            return estimatedPriceOfToken;
          }
        } catch Error(string memory reason) {
          console.log("exception getPrice:", reason);
        } catch (bytes memory reason) {
          console.log("exception getPrice:");
        }
      }
    }
    console.log("Not enough liquidity found for helper tokens pairs in getPrice.");
    //optionally can make function revert if no price is found.
    //require(false, "Not enough liquidity found for token in getPrice.");
    return 0;
  }

  function getReservesPangolin(address tokenA, address tokenB) public view returns (uint reserveA, uint reserveB) {
    (address token0,) = sortTokens(tokenA, tokenB);
    address pair = IPangolinFactory(PANGOLIN_FACTORY_ADDRESS).getPair(tokenA,tokenB);
    if (pair == 0x0000000000000000000000000000000000000000){
      (reserveA, reserveB) = (0,0);
    }else{
      try IPangolinPair(pair).getReserves()
      returns (uint112 reserve0, uint112 reserve1, uint32 t) {
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
      } catch Error(string memory reason) {
        (reserveA, reserveB) = (0,0);
      } catch (bytes memory reason) {
        (reserveA, reserveB) = (0,0);
      }
    }
  }
  function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
    require(tokenA != tokenB, 'PangOrTjLibrary: IDENTICAL_ADDRESSES');
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), 'PangOrTjLibrary: ZERO_ADDRESS');
  }

  function numDigits(uint256 number) internal pure returns (uint256) {
    uint256 digits = 0;
    while (number != 0) {
      number /= 10;
      digits++;
    }
    return digits;
  }

}
