import { CreateInventoryMasterDto } from './create-inventory-master.dto';

export class UpdateInventoryMasterDto implements Partial<CreateInventoryMasterDto> {
  itemName?: string;
  category?: any;
  status?: any;
}
