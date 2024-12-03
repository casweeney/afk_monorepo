import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SellToken } from './interfaces';

@Injectable()
export class SellTokenService {
  private readonly logger = new Logger(SellTokenService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: SellToken) {
    try {
      const sellTokenRecord =
        await this.prismaService.token_transactions.findUnique({
          where: { transfer_id: data.transferId },
        });

      if (sellTokenRecord) {
        this.logger.warn(
          `Record with transfer ID ${data.transferId} already exists`,
        );
        return;
      }

      const tokenLaunchRecord = await this.prismaService.token_launch.findFirst(
        { where: { memecoin_address: data.memecoinAddress } },
      );

      if (!tokenLaunchRecord) {
        this.logger.warn(
          `Record with memecoin address ${data.memecoinAddress} doesn't exists`,
        );
      } else {
        const newSupply =
          Number(tokenLaunchRecord.current_supply ?? 0) + Number(data.amount);
        const newLiquidityRaised =
          Number(tokenLaunchRecord.liquidity_raised ?? 0) -
          Number(data.quoteAmount);
        const newTotalTokenHolded =
          Number(tokenLaunchRecord.total_token_holded ?? 0) -
          Number(data.amount);

        await this.prismaService.token_launch.update({
          where: { transaction_hash: tokenLaunchRecord.transaction_hash },
          data: {
            current_supply: newSupply.toString(),
            liquidity_raised: newLiquidityRaised.toString(),
            total_token_holded: newTotalTokenHolded.toString(),
          },
        });
      }

      await this.prismaService.token_transactions.create({
        data: {
          transfer_id: data.transferId,
          network: data.network,
          block_hash: data.blockHash,
          block_number: data.blockNumber,
          block_timestamp: data.blockTimestamp,
          transaction_hash: data.transactionHash,
          memecoin_address: data.memecoinAddress,
          owner_address: data.ownerAddress,
          last_price: data.lastPrice,
          quote_amount: data.quoteAmount,
          price: data.price,
          amount: data.amount,
          protocol_fee: data.protocolFee,
          time_stamp: data.timestamp,
          transaction_type: data.transactionType,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating buy token record: ${error.message}`,
        error.stack,
      );
    }
  }
}