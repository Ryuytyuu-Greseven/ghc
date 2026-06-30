import { Controller, Get, Param, UseGuards, Req, ForbiddenException, NotFoundException, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { BranchInventory, BranchInventoryDocument } from '../schemas/branch-inventory.schema';
import { InventoryMaster, InventoryMasterDocument } from '../schemas/inventory-master.schema';
import { InventoryCategory } from '../common/enums';

@Controller('medicines')
@UseGuards(JwtAuthGuard)
export class MedicinesController {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(InventoryMaster.name)
    private readonly inventoryMasterModel: Model<InventoryMasterDocument>,
  ) {}

  @Get()
  async findAll(@Req() req: any, @Query() query?: Record<string, any>): Promise<any[]> {
    const user = req.user;
    const isDashboard = query?.dashboard === 'true';
    const hospitalId = isDashboard ? await this.usersService.getAssignedHospitalId(user.userId, user.role) : null;

    if (hospitalId) {
      // Filtered view (Dashboard only): filter by user's assigned hospital/branch
      const branchStock = await this.branchInventoryModel
        .find({ branchId: hospitalId })
        .populate('itemId')
        .exec();
      return branchStock
        .filter(item => item.itemId && (item.itemId as any).category === InventoryCategory.MEDICINE)
        .map(item => {
          const itemId = item.itemId as any;
          return {
            _id: itemId._id,
            name: itemId.itemName,
            dosage: 'N/A',
            stock: item.availableQty || 0,
            manufacturer: 'N/A',
            category: 'medication',
            unit: 'units',
            expiryDate: item.expiryDate,
            pricePerUnit: 0,
            isAvailable: (item.availableQty || 0) > 0,
            branchId: item.branchId,
            createdAt: (item as any).createdAt,
            updatedAt: (item as any).updatedAt,
          };
        });
    } else {
      // Global view (List screens): get all medicines with aggregated stock across branches
      const masterItems = await this.inventoryMasterModel
        .find({ category: InventoryCategory.MEDICINE })
        .exec();
      const results: any[] = [];
      for (const item of masterItems) {
        const branchStocks = await this.branchInventoryModel
          .find({ itemId: item._id })
          .exec();
        const totalStock = branchStocks.reduce((sum, b) => sum + (b.availableQty || 0), 0);
        results.push({
          _id: item._id,
          name: item.itemName,
          dosage: 'N/A',
          stock: totalStock,
          manufacturer: 'N/A',
          category: 'medication',
          unit: 'units',
          expiryDate: null,
          pricePerUnit: 0,
          isAvailable: totalStock > 0,
          branchId: null,
          createdAt: (item as any).createdAt,
          updatedAt: (item as any).updatedAt,
        });
      }
      return results;
    }
  }

  @Get('available')
  async findAvailable(@Req() req: any, @Query() query?: Record<string, any>): Promise<any[]> {
    const list = await this.findAll(req, query);
    return list.filter(m => m.stock > 0);
  }

  @Get('category/:category')
  async findByCategory(@Req() req: any, @Param('category') category: string, @Query() query?: Record<string, any>): Promise<any[]> {
    return this.findAll(req, query);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string): Promise<any> {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);

    const item = await this.inventoryMasterModel.findById(id).exec();
    if (!item) throw new NotFoundException(`Medicine ${id} not found`);

    const branchStocks = await this.branchInventoryModel
      .find({ itemId: item._id })
      .exec();
    const totalStock = branchStocks.reduce((sum, b) => sum + (b.availableQty || 0), 0);

    const medicine = {
      _id: item._id,
      name: item.itemName,
      dosage: 'N/A',
      stock: totalStock,
      manufacturer: 'N/A',
      category: 'medication',
      unit: 'units',
      expiryDate: null,
      pricePerUnit: 0,
      isAvailable: totalStock > 0,
      branchId: null,
      createdAt: (item as any).createdAt,
      updatedAt: (item as any).updatedAt,
    };

    if (hospitalId) {
      // Find if this branch has this stock
      const branchStock = await this.branchInventoryModel
        .findOne({ branchId: hospitalId, itemId: item._id })
        .exec();
      if (branchStock) {
        medicine.stock = branchStock.availableQty || 0;
        medicine.isAvailable = medicine.stock > 0;
        medicine.branchId = branchStock.branchId as any;
      }
    }

    return medicine;
  }
}
