DROP DATABASE IF EXISTS canpower;

CREATE DATABASE canpower;

USE canpower;

CREATE TABLE IF NOT EXISTS device_data (
    device_id varchar(255) PRIMARY KEY,
    points INT DEFAULT 0,
    counter INT DEFAULT 0
);

#INSERT INTO device_data (device_id, points) VALUES ('ESP32_S3_12345', 10)