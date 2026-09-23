package com.example.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class PokemonTcgConfig {

    @Bean
    public RestClient pokemonTcgRestClient(RestClient.Builder builder,
                                           @Value("${pokemontcg.base-url}") String baseUrl,
                                           @Value("${pokemontcg.api-key}") String apiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        builder.baseUrl(baseUrl).requestFactory(requestFactory);
        // la chiave è facoltativa: l'header si invia solo se configurata
        if (!apiKey.isBlank()) {
            builder.defaultHeader("X-Api-Key", apiKey);
        }
        return builder.build();
    }
}
