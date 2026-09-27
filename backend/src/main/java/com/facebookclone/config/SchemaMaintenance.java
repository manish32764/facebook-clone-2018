package com.facebookclone.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.util.List;
import java.util.Map;

/**
 * Hibernate writes a CHECK constraint listing every enum value when it first
 * creates a table, and ddl-auto=update never revisits it. Adding a value later
 * (a new notification type, a new post audience) would then fail every insert
 * that used it. Dropping those checks on startup keeps enums extensible; the
 * Java enum is the real guard.
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class SchemaMaintenance implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) throws Exception {
        String product;
        try (Connection connection = jdbc.getDataSource().getConnection()) {
            product = connection.getMetaData().getDatabaseProductName();
        }
        if (!"PostgreSQL".equalsIgnoreCase(product)) return;

        List<Map<String, Object>> checks = jdbc.queryForList("""
                SELECT c.conrelid::regclass::text AS table_name, c.conname AS name
                FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
                WHERE c.contype = 'c' AND n.nspname = 'public' AND c.conrelid <> 0
                  AND pg_get_constraintdef(c.oid) LIKE '%ANY%ARRAY%'
                """);
        for (Map<String, Object> row : checks) {
            jdbc.execute("ALTER TABLE " + row.get("table_name") + " DROP CONSTRAINT IF EXISTS \"" + row.get("name") + "\"");
        }
        if (!checks.isEmpty()) log.info("Dropped {} enum check constraints so new enum values can be stored", checks.size());
    }
}
