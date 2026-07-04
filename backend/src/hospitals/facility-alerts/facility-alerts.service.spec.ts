import { FacilityAlertsService } from './facility-alerts.service';

describe('FacilityAlertsService', () => {
  let service: FacilityAlertsService;
  let mockHospitalRepo: any;
  let mockBedAllocationRepo: any;
  let mockBranchInventoryRepo: any;
  let mockStaffRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    mockHospitalRepo = {
      findAll: jest.fn(),
    };
    mockBedAllocationRepo = {};
    mockBranchInventoryRepo = {
      findByBranch: jest.fn(),
    };
    mockStaffRepo = {
      findByHospital: jest.fn(),
    };
    mockPatientRepo = {
      findByHospital: jest.fn(),
    };

    service = new FacilityAlertsService(
      mockHospitalRepo,
      mockBedAllocationRepo,
      mockBranchInventoryRepo,
      mockStaffRepo,
      mockPatientRepo,
    );
  });

  it('should return empty list when there are no hospitals', async () => {
    mockHospitalRepo.findAll.mockResolvedValue([]);
    const alerts = await service.getInterventionAlerts();
    expect(alerts).toEqual([]);
  });

  it('should flag a bed shortage when occupancy rate exceeds 85%', async () => {
    mockHospitalRepo.findAll.mockResolvedValue([
      {
        _id: 'hosp-1',
        name: 'Test CHC',
        type: 'CHC',
        totalBeds: 20,
        availableBeds: 2, // 18/20 = 90% occupancy
      },
    ]);
    mockBranchInventoryRepo.findByBranch.mockResolvedValue([]);
    mockPatientRepo.findByHospital.mockResolvedValue([]);
    mockStaffRepo.findByHospital.mockResolvedValue([]);

    const alerts = await service.getInterventionAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      branchId: 'hosp-1',
      branchName: 'Test CHC',
      type: 'Bed Shortage',
      severity: 'Medium',
    });
  });

  it('should flag severe stockout if out of stock items exceed 25%', async () => {
    mockHospitalRepo.findAll.mockResolvedValue([
      {
        _id: 'hosp-1',
        name: 'Test PHC',
        type: 'PHC',
        totalBeds: 10,
        availableBeds: 5,
      },
    ]);
    // 2 out of 4 items are out of stock (50% stockout rate)
    mockBranchInventoryRepo.findByBranch.mockResolvedValue([
      { itemId: 'item-1', availableQty: 10 },
      { itemId: 'item-2', availableQty: 0 },
      { itemId: 'item-3', availableQty: 15 },
      { itemId: 'item-4', availableQty: 0 },
    ]);
    mockPatientRepo.findByHospital.mockResolvedValue([]);
    mockStaffRepo.findByHospital.mockResolvedValue([]);

    const alerts = await service.getInterventionAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      branchId: 'hosp-1',
      type: 'Severe Stockout',
      severity: 'High', // since 50% > 40%
    });
  });

  it('should flag staff crunch when active patient to staff ratio is high', async () => {
    mockHospitalRepo.findAll.mockResolvedValue([
      {
        _id: 'hosp-1',
        name: 'Test PHC',
        type: 'PHC',
        totalBeds: 10,
        availableBeds: 5,
      },
    ]);
    mockBranchInventoryRepo.findByBranch.mockResolvedValue([]);
    mockPatientRepo.findByHospital.mockResolvedValue([
      { _id: 'p-1', isActive: true },
      { _id: 'p-2', isActive: true },
      { _id: 'p-3', isActive: true },
      { _id: 'p-4', isActive: true },
      { _id: 'p-5', isActive: true },
      { _id: 'p-6', isActive: true },
      { _id: 'p-7', isActive: true },
      { _id: 'p-8', isActive: true },
      { _id: 'p-9', isActive: true },
      { _id: 'p-10', isActive: true },
      { _id: 'p-11', isActive: true },
      { _id: 'p-12', isActive: true },
    ]);
    // Only 1 staff assigned (12:1 ratio)
    mockStaffRepo.findByHospital.mockResolvedValue([{ _id: 'staff-1' }]);

    const alerts = await service.getInterventionAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      branchId: 'hosp-1',
      type: 'Staff Crunch',
      severity: 'Medium', // 12:1 is >10 but <15
    });
  });
});
