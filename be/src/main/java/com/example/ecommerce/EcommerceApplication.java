package com.example.ecommerce;

import com.example.ecommerce.config.DatabaseUrl;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// l'utente in memoria di default di Spring Security non serve: l'autenticazione è solo via JWT
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class EcommerceApplication {

    public static void main(String[] args) {
        // su Render le credenziali arrivano in DATABASE_URL, formato non JDBC:
        // la traduzione va fatta prima che parta il contesto Spring
        DatabaseUrl.applicaSePresente();

        SpringApplication.run(EcommerceApplication.class, args);
    }
}
