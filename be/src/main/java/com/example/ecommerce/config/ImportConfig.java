package com.example.ecommerce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class ImportConfig {

    // scaricamenti completi da pokemontcg.io lanciati dalle pagine pubbliche (ImportInBackground). Due alla volta:
    // pokemontcg.io risponde spesso 500 se lo si interroga troppo. Con la coda piena l'import si rinvia alla visita dopo
    @Bean
    public ThreadPoolTaskExecutor importExecutor() {
        ThreadPoolTaskExecutor esecutore = new ThreadPoolTaskExecutor();
        esecutore.setCorePoolSize(2);
        esecutore.setMaxPoolSize(2);
        esecutore.setQueueCapacity(20);
        esecutore.setThreadNamePrefix("import-");
        return esecutore;
    }
}
