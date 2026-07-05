import { CreateHospitalDto } from './create-hospital.dto';

export class UpdateHospitalDto implements Partial<CreateHospitalDto> {
  name?: string;
  type?: any;
  address?: string;
  city?: number;
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
