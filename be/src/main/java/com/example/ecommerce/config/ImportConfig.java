package com.example.ecommerce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class ImportConfig {

    // scaricamenti completi da TCGdex lanciati dalle pagine pubbliche (ImportInBackground). Due alla volta:
    // non si martella l'API esterna, e ogni scaricamento ha già 8 dettagli in parallelo. Con la coda piena l'import si rinvia alla visita dopo
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
