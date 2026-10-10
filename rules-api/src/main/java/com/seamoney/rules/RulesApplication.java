package com.seamoney.rules;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class RulesApplication {

    public static void main(String[] args) throws IOException {
        // SQLite creates the file but not its folder.
        String dir = System.getenv().getOrDefault("DATA_DIR", "./data");
        Files.createDirectories(Path.of(dir));
        SpringApplication.run(RulesApplication.class, args);
    }
}
