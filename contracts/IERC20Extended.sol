pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

abstract contract IERC20Extended is IERC20Upgradeable {
    function decimals() public view virtual returns (uint8);
    function name() public view virtual returns (string memory);
}
