pragma solidity 0.8.7;

interface IProsperoPrices {
  function getPrice(address tokenAddress) external returns (uint256);
}
