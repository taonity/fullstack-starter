CREATE TABLE config_override (
    config_key VARCHAR(200) PRIMARY KEY,
    value_json VARCHAR(20000) NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(320) NOT NULL
);
