const required = (value: string | undefined, label: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${label}`);
  }

  return value;
};

export const env = {
  get jwtSecret() {
    return required(process.env.JWT_SECRET, "JWT_SECRET");
  },
  get mongoUri() {
    return required(process.env.MONGODB_URI, "MONGODB_URI");
  },
  get aiGatewayApiKey() {
    return required(process.env.AI_GATEWAY_API_KEY, "AI_GATEWAY_API_KEY");
  },
  get aiGatewayBaseUrl() {
    return process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1";
  },
  get aiGatewayModel() {
    return process.env.AI_GATEWAY_MODEL ?? "gpt-4.1-mini";
  },
  get awsRegion() {
    return required(process.env.AWS_REGION, "AWS_REGION");
  },
  get awsBucket() {
    return required(
      process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET,
      "AWS_BUCKET_NAME",
    );
  },
  get awsAccessKeyId() {
    return required(process.env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID");
  },
  get awsSecretAccessKey() {
    return required(process.env.AWS_SECRET_ACCESS_KEY, "AWS_SECRET_ACCESS_KEY");
  },
};
