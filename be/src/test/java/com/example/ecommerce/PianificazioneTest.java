package com.example.ecommerce;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.task.TaskSchedulingAutoConfiguration;
import org.springframework.boot.env.PropertiesPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.env.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// I job pianificati con le proprietà vere di application.properties: due thread, così il primo giro lungo di
// RiempimentoVarianti non blocca gli altri job
class PianificazioneTest {

    @Configuration
    @EnableScheduling
    static class ConPianificazione {
    }

    @Test
    void schedulerConDueThread() throws IOException {
        List<PropertySource<?>> proprieta = new PropertiesPropertySourceLoader()
                .load("application", new ClassPathResource("application.properties"));

        new ApplicationContextRunner()
                .withInitializer(contesto -> proprieta.forEach(contesto.getEnvironment().getPropertySources()::addLast))
                .withConfiguration(AutoConfigurations.of(TaskSchedulingAutoConfiguration.class))
                .withUserConfiguration(ConPianificazione.class)
                .run(contesto -> assertThat(contesto.getBean(ThreadPoolTaskScheduler.class)
                        .getScheduledThreadPoolExecutor().getCorePoolSize()).isEqualTo(2));
    }
}
