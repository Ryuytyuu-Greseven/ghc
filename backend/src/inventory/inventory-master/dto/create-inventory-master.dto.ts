import { InventoryCategory, InventoryStatus } from '../../../common/enums';

export class CreateInventoryMasterDto {
  itemName: string;
  category: InventoryCategory;
  status?: InventoryStatus;
}
