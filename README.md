## Prospero Prices

The contract ProsperoPrices uses [Chainlink price feeds](https://docs.chain.link/docs/avalanche-price-feeds/) and the Pangolin DEX on Avalanche to get prices for tokens that are not offered up by Chainlink but have sufficient liquidity in their pools.
In [our tests](https://docs.google.com/spreadsheets/d/1kClFiDkgKXLLOUv6JzuBbLLb9YtDIIqXBde59Oxr_cc/edit#gid=1278651676), as long as sufficient liquidity existed, we were able to get within 1% accuracy using Coingecko’s API as a reference point with about 100 tokens.  Our contract uses 'helper' tokens that have pairs with good liquidity on Pangolin such as AVAX, USDC.e and Ethereum.  Prices are estimated by first getting the price of a token on Pangolin of a pair and then multiplying that price times the known price of the helper token on Chainlink.  

The contract is deployed at this address: [0x45f0154cfB256e662C457Aaf3E073254F41A0994](https://snowtrace.io/address/0x45f0154cfB256e662C457Aaf3E073254F41A0994)

The current scale of pricing is a constant determined by USD_SCALE.  If you change this value you must also change the value of CHAINLINK_SCALE_DIFF.  The scale of Chainlink is currently 8 decimals.  To raise the minimum liquidity required to deem a pool a ‘safe’ reference point for price is determined by the constant MINIMUM_LIQUIDITY_REQUIRED

To try our contract in action go here:
[https://prospero-307218.uc.r.appspot.com/testprices/](https://prospero-307218.uc.r.appspot.com/testprices/)

## To Run

First install dependencies then you can run pricing tests with:
npx hardhat test

##### Gas Costs

The gas costs of using ProsperoPrices is similar to the gas to use Chainlink price feeds.  When a price could not be found the gas was higher because it iterated through several helper tokens unsuccessfully  
  In Gwei:
  Gas Cost Calling Chainlink:	        24433
  Gas Cost With One Helper Token:	    61031
  Gas Cost With 3 (no price found):	 100173
