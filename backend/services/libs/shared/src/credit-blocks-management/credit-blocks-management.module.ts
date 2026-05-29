import { Module } from "@nestjs/common";
<<<<<<< HEAD
import { TypeOrmModule } from "@nestjs/typeorm";
import { CreditBlocksManagementService } from "./credit-blocks-management.service";
import { UtilModule } from "../util/util.module";
import { SerialNumberManagementModule } from "../serial-number-management/serial-number-management.module";
import { ItmoAccount } from "../entities/itmo.account.entity";

@Module({
  imports: [
    UtilModule,
    SerialNumberManagementModule,
    TypeOrmModule.forFeature([ItmoAccount]),
  ],
=======
import { CreditBlocksManagementService } from "./credit-blocks-management.service";
import { UtilModule } from "../util/util.module";
import { SerialNumberManagementModule } from "../serial-number-management/serial-number-management.module";

@Module({
  imports: [UtilModule, SerialNumberManagementModule],
>>>>>>> target/main
  providers: [CreditBlocksManagementService],
  exports: [CreditBlocksManagementService],
})
export class CreditBlocksManagementModule {}
