export enum DiagnosticTestCategory {
  Lab = 'Lab',
  Imaging = 'Imaging',
  Pathology = 'Pathology',
  Other = 'Other',
}

export enum TestAvailabilityStatus {
  NotAudited = 'NotAudited',
  Available = 'Available',
  Unavailable = 'Unavailable',
  Partial = 'Partial',
  OutOfOrder = 'OutOfOrder',
}

export enum DiagnosticTestStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}
