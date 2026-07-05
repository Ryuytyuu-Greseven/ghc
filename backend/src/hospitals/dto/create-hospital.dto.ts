import { FacilityType } from '../../shared/enums/facility-type.enum';

export class CreateHospitalDto {
  name: string;
  type: FacilityType;
  address: string;
  city: number;
  state?: number;
  phone?: string;
  email?: string;
  totalBeds?: number;
  availableBeds?: number;
  parentCHCId?: any;
  medicalOfficer?: string | null;
  specialists?: string[];
  hasOT?: boolean;
  hasXRay?: boolean;
  hasAmbulance?: boolean;
  isActive?: boolean;
  hospitalId?: string | null;
}
