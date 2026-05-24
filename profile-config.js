const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  github_username: "Wsh7Ash",
  picoctf_username: "spw",
  leetcode_username: "vOF31ss21z"
};

function loadProfileConfig(rootDir = process.cwd()) {
  const configPath = path.join(rootDir, "profile.config.json");
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };

  return {
    ...DEFAULT_CONFIG,
    ...JSON.parse(fs.readFileSync(configPath, "utf8"))
  };
}

function loadPicoCTFUsername(rootDir = process.cwd()) {
  return loadProfileConfig(rootDir).picoctf_username;
}

module.exports = {
  DEFAULT_CONFIG,
  loadPicoCTFUsername,
  loadProfileConfig
};
