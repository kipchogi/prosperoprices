## Prospero Prices

The contract ProsperoPrices uses Chainlink price feeds and the Pangolin DEX on Avalanche to get estimated prices for tokens that are not offered up by chainlink.
In our tests, as long as sufficient liquidity existed, we were able to get within .01% accuracy compared to prices on coingecko when we ran a sample of about 100 tokens.
Our contract uses 'helper' tokens that usually have pairs with good liquidity on Pangolin such as AVAX, Pangolin Token, USDC and Ethereum.
Prices are estimated by first getting the price of a token on Pangolin of a pair and then multiplying that price times the known price of the helper token on Chainlink.  
It will only return price if there is enough liquidity in a pool determined by the constant MINIMUM_LIQUIDITY_REQUIRED.  

Contract is deployed at this address: 0x45f0154cfB256e662C457Aaf3E073254F41A0994

Latest Chainlink price feeds can be found here:
https://docs.chain.link/docs/avalanche-price-feeds/

The current scale of pricing is a constant determined by USD_SCALE.  If you change this value you must also change the
value of CHAINLINK_SCALE_DIFF.  The scale of Chainlink is currently 8 decimals.  

To try our contract in action go here:
https://prospero-307218.uc.r.appspot.com/testprices/


<!-- GETTING STARTED -->
## To Run

First install dependencies then you can run pricing tests with:
npx hardhat test

#### Accuracy

We compared prices of the top 150 tokens by USD liquidity on Pangolin with prices from coingecko.  When a price existed on Coingecko and there was
sufficient liquidity to get a price from our contract, we were able to get within .01% accuracy.
Our results can be found here:  
https://docs.google.com/spreadsheets/d/1kClFiDkgKXLLOUv6JzuBbLLb9YtDIIqXBde59Oxr_cc/edit#gid=1278651676


##### Gas Costs

The gas costs of using ProsperoPrices is similar to the price of using Chainlink.  
When a price could not be found the gas was higher because it iterated through several helper tokens unsuccessfully  
In Gwei:
Gas Cost Calling Chainlink:	        24433
Gas Cost With One Helper Token:	    61031
Gas Cost With 3 (no price found):	 100173
