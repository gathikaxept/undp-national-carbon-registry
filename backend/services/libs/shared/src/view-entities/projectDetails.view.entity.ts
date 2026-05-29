import { ViewColumn, ViewEntity } from "typeorm";
import { CompanyState } from "../enum/company.state.enum";
import { TxType } from "../enum/txtype.enum";
import { ActivityEntity } from "../entities/activity.entity";

@ViewEntity({
  expression: `
<<<<<<< HEAD
    SELECT
      p."refId",
      p."title",
      p."serialNumber" as "serialNo",
      p."authorizationId",
      p."projectProposalStage",
=======
    SELECT 
      p."refId", 
      p."title", 
      p."serialNumber" as "serialNo",
      p."authorizationId",
      p."projectProposalStage", 
>>>>>>> target/main
      p."creditEst",
      p."creditBalance",
      p."creditRetired",
      p."creditTransferred",
      p."independentCertifiers" as "certifierId",
      p."noObjectionLetterUrl",
<<<<<<< HEAD
      p."cooperativeApproachId",
      p."authorizationPurpose"::text AS "authorizationPurpose",
      p."acquiringPartyCountryCode",
=======
>>>>>>> target/main
      jsonb_build_object(
        'name', c."name",
        'logo', c."logo",
        'companyRole', c."companyRole",
        'state', c."state",
        'email', c."email",
        'companyId',p."companyId"
      ) AS "company"
    FROM "project_entity" p
    JOIN "company" c ON p."companyId" = c."companyId"
  `,
})
export class ProjectDetailsViewEntity {
  @ViewColumn()
  refId: string;

  @ViewColumn()
  title: string;

  @ViewColumn()
  serialNo: string;

  @ViewColumn()
  authorizationId: string;

  @ViewColumn()
  projectProposalStage: string;

  @ViewColumn()
  creditEst: number;

  @ViewColumn()
  creditBalance: number;

  @ViewColumn()
  creditRetired: number;

  @ViewColumn()
  creditTransferred: number;

  @ViewColumn()
  certifierId: number[];

  @ViewColumn()
  company: {
    name: string;
    logo: string;
    companyRole: string;
    state: CompanyState;
    email: string;
    companyId: number;
  };

  @ViewColumn()
  noObjectionLetterUrl: string;

<<<<<<< HEAD
  // Article 6.2 linkage. Surfaced to the project detail page so a
  // user can see which cooperative approach a project sits under
  // and the authorization purpose / acquiring party that drives
  // its CA-ADJ + AEF treatment.
  @ViewColumn()
  cooperativeApproachId: string;

  @ViewColumn()
  authorizationPurpose: string;

  @ViewColumn()
  acquiringPartyCountryCode: string;

=======
>>>>>>> target/main
  activities: ActivityEntity[];
}
