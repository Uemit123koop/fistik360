export type SettlementType = "NEIGHBORHOOD";

export interface LocationOption {
  id: string;
  name: string;
  type?: SettlementType;
}

export interface LocationSelection {
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  settlementId: string;
  settlementName: string;
  settlementType: SettlementType;
}
