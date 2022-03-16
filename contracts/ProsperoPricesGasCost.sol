pragma solidity 0.8.7;
// SPDX-License-Identifier: UNLICENSED;

import "./IERC20Extended.sol";
import "./IProsperoPrices.sol";
import "hardhat/console.sol";

contract ProsperoPricesGasCost{

  constructor(){}

  function getGasCost(address prosperoPricesAddress, address tokenAddress) public returns(uint256){
    console.log("Address:",tokenAddress);
    uint256 gasStart = gasleft();
    uint price = IProsperoPrices(prosperoPricesAddress).getPrice(tokenAddress);
    console.log('cost:',(gasStart-gasleft()));
    console.log('price:',uint256(price));
    return price;
  }
}
