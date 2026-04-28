import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Spin,
  Switch,
  Tabs,
  Tag,
  message,
} from "antd";
import { useConnection } from "../../Context/ConnectionContext/connectionContext";

const { TextArea } = Input;

const statusColors: Record<string, string> = {
  Draft: "default",
  Submitted: "blue",
  Published: "green",
};

type IrShape = {
  reportId: string;
  status: string;
  cooperativeApproachId: string;
  caMethodDescription: string | null;
  participationDemonstration: any;
  itmoMetrics: any;
  ndcQuantification: any;
  cooperativeApproachDetails: any;
  environmentalIntegrity: any;
};

const csv = (arr: any) =>
  Array.isArray(arr) ? arr.join(", ") : "";

const splitCsv = (s: string | undefined) =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const EditInitialReport = () => {
  const navigate = useNavigate();
  const { reportId = "" } = useParams<{ reportId: string }>();
  const { post, put } = useConnection();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ir, setIr] = useState<IrShape | null>(null);

  const fetchIr = async () => {
    setLoading(true);
    try {
      const res = await post("national/initialReport/query", {
        page: 1,
        size: 1,
        filterAnd: [{ key: "reportId", operation: "=", value: reportId }],
      });
      const row = res?.data?.[0];
      if (!row) {
        message.error(`Initial report ${reportId} not found`);
        navigate("/initialReports/viewAll");
        return;
      }
      setIr(row);
      form.setFieldsValue({
        caMethodDescription: row.caMethodDescription ?? "",
        participation_isPartyToParisAgreement:
          row.participationDemonstration?.isPartyToParisAgreement ?? true,
        participation_hasNDC: row.participationDemonstration?.hasNDC ?? true,
        participation_hasTrackingArrangements:
          row.participationDemonstration?.hasTrackingArrangements ?? true,
        participation_hasAuthorizationArrangements:
          row.participationDemonstration?.hasAuthorizationArrangements ?? true,
        participation_countryCode:
          row.participationDemonstration?.countryCode ?? "",
        itmo_primaryMetric: row.itmoMetrics?.primaryMetric ?? "tCO2e",
        itmo_nonGhgMetrics: csv(row.itmoMetrics?.nonGhgMetrics),
        ndc_target: row.ndcQuantification?.ndcTarget ?? null,
        ndc_baseYear: row.ndcQuantification?.baseYear ?? null,
        ndc_targetYear: row.ndcQuantification?.targetYear ?? null,
        ndc_sectors: csv(row.ndcQuantification?.sectors),
        ndc_ghgs: csv(row.ndcQuantification?.ghgs),
        ca_title: row.cooperativeApproachDetails?.title ?? "",
        ca_participatingParties: csv(
          row.cooperativeApproachDetails?.participatingParties
        ),
        ca_description: row.cooperativeApproachDetails?.description ?? "",
        ca_expectedMitigation:
          row.cooperativeApproachDetails?.expectedMitigation ?? "",
        env_noNetIncrease:
          row.environmentalIntegrity?.noNetIncrease ?? "",
        env_conservativeBaselines:
          row.environmentalIntegrity?.conservativeBaselines ?? "",
        env_nonPermanenceRisk:
          row.environmentalIntegrity?.nonPermanenceRisk ?? "",
        env_leakageRisk: row.environmentalIntegrity?.leakageRisk ?? "",
      });
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ?? "Failed to load initial report"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) fetchIr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const buildPayload = (values: any) => ({
    reportId,
    caMethodDescription: values.caMethodDescription ?? "",
    participationDemonstration: {
      isPartyToParisAgreement: !!values.participation_isPartyToParisAgreement,
      hasNDC: !!values.participation_hasNDC,
      hasTrackingArrangements: !!values.participation_hasTrackingArrangements,
      hasAuthorizationArrangements:
        !!values.participation_hasAuthorizationArrangements,
      countryCode: values.participation_countryCode || "",
    },
    itmoMetrics: {
      primaryMetric: values.itmo_primaryMetric || "tCO2e",
      nonGhgMetrics: splitCsv(values.itmo_nonGhgMetrics),
    },
    ndcQuantification: {
      ndcTarget:
        values.ndc_target === null || values.ndc_target === undefined
          ? null
          : Number(values.ndc_target),
      baseYear:
        values.ndc_baseYear === null || values.ndc_baseYear === undefined
          ? null
          : Number(values.ndc_baseYear),
      targetYear:
        values.ndc_targetYear === null || values.ndc_targetYear === undefined
          ? null
          : Number(values.ndc_targetYear),
      sectors: splitCsv(values.ndc_sectors),
      ghgs: splitCsv(values.ndc_ghgs),
    },
    cooperativeApproachDetails: {
      title: values.ca_title || "",
      participatingParties: splitCsv(values.ca_participatingParties),
      description: values.ca_description || "",
      expectedMitigation: values.ca_expectedMitigation || "",
    },
    environmentalIntegrity: {
      noNetIncrease: values.env_noNetIncrease || "",
      conservativeBaselines: values.env_conservativeBaselines || "",
      nonPermanenceRisk: values.env_nonPermanenceRisk || "",
      leakageRisk: values.env_leakageRisk || "",
    },
  });

  const onSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      await put("national/initialReport/update", buildPayload(values));
      message.success("Saved");
      await fetchIr();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ?? "Failed to save initial report"
      );
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await put(
        `national/initialReport/submit?id=${encodeURIComponent(reportId)}`,
        {}
      );
      message.success("Initial report submitted");
      await fetchIr();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ?? "Failed to submit initial report"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !ir) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  const isPublished = ir.status === "Published";
  const isSubmitted = ir.status === "Submitted";
  const canSubmit = ir.status === "Draft";

  return (
    <div style={{ padding: "0 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>
              {ir.reportId}{" "}
              <Tag color={statusColors[ir.status] || "default"}>
                {ir.status}
              </Tag>
            </div>
            <div
              style={{ fontSize: "0.875rem", color: "rgba(58,53,65,0.6)" }}
            >
              Cooperative Approach: {ir.cooperativeApproachId} — Decision
              2/CMA.3 para. 18
            </div>
          </Col>
          <Col>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => navigate("/initialReports/viewAll")}
            >
              Back
            </Button>
            <Button
              style={{ marginRight: 8 }}
              onClick={onSave}
              loading={saving}
              disabled={isPublished}
            >
              Save Draft
            </Button>
            <Button
              type="primary"
              onClick={onSubmit}
              loading={submitting}
              disabled={!canSubmit}
            >
              Submit
            </Button>
          </Col>
        </Row>
        {isSubmitted && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#e6f4ff",
              border: "1px solid #91caff",
              borderRadius: 4,
              fontSize: "0.875rem",
            }}
          >
            This report is Submitted. Edits are accepted today (Published is
            the only locked status), but typically Submitted reports should
            be treated as final.
          </div>
        )}
        {isPublished && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#fff1f0",
              border: "1px solid #ffa39e",
              borderRadius: 4,
              fontSize: "0.875rem",
            }}
          >
            This report is Published — edits and resubmission are disabled.
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          boxShadow:
            "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px rgba(0,0,0,0.14), 0px 1px 3px rgba(0,0,0,0.12)",
        }}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={isPublished}
          requiredMark={false}
        >
          <Tabs
            defaultActiveKey="participation"
            items={[
              {
                key: "participation",
                label: "Participation",
                children: (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item
                        name="participation_isPartyToParisAgreement"
                        label="Party to Paris Agreement"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="participation_hasNDC"
                        label="Has NDC"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="participation_hasTrackingArrangements"
                        label="Has tracking arrangements"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="participation_hasAuthorizationArrangements"
                        label="Has authorization arrangements"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="participation_countryCode"
                        label="Country code"
                      >
                        <Input placeholder="e.g. NG" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "itmo",
                label: "ITMO Metrics",
                children: (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item
                        name="itmo_primaryMetric"
                        label="Primary metric"
                      >
                        <Input placeholder="tCO2e" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="itmo_nonGhgMetrics"
                        label="Non-GHG metrics (comma-separated)"
                      >
                        <Input placeholder="e.g. resilience-units" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "ndc",
                label: "NDC Quantification",
                children: (
                  <Row gutter={24}>
                    <Col span={8}>
                      <Form.Item name="ndc_target" label="NDC target (tCO2eq)">
                        <InputNumber style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="ndc_baseYear" label="Base year">
                        <InputNumber style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="ndc_targetYear" label="Target year">
                        <InputNumber style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="ndc_sectors"
                        label="Sectors (comma-separated)"
                      >
                        <Input placeholder="e.g. Energy, Forestry" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="ndc_ghgs"
                        label="GHGs (comma-separated)"
                      >
                        <Input placeholder="CO2" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="caMethodDescription"
                        label="Corresponding adjustment method description"
                      >
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "ca",
                label: "Cooperative Approach Details",
                children: (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item name="ca_title" label="Title">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="ca_participatingParties"
                        label="Participating parties (comma-separated)"
                      >
                        <Input placeholder="NG, CH" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="ca_description" label="Description">
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="ca_expectedMitigation"
                        label="Expected mitigation outcomes"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "env",
                label: "Environmental Integrity",
                children: (
                  <Row gutter={24}>
                    <Col span={24}>
                      <Form.Item
                        name="env_noNetIncrease"
                        label="No net increase in emissions"
                      >
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="env_conservativeBaselines"
                        label="Conservative baselines"
                      >
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="env_nonPermanenceRisk"
                        label="Non-permanence risk"
                      >
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="env_leakageRisk"
                        label="Leakage risk"
                      >
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </div>
    </div>
  );
};

export default EditInitialReport;
