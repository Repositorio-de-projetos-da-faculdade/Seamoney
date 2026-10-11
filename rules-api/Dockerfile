# syntax=docker/dockerfile:1
# Seamoney rules-api (Java 21, Spring Boot). Build and tests run inside Docker, so no local JDK/Maven is needed.
#   docker build --target test -t seamoney-rules-api:test .   # runs the unit and API tests
#   docker build -t seamoney-rules-api .                       # production image

FROM maven:3.9-eclipse-temurin-21 AS deps
WORKDIR /src
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline

FROM deps AS test
COPY src ./src
RUN mvn -B -ntp test

FROM deps AS build
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre AS run
WORKDIR /app
ENV PORT=8080 JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && groupadd --system app && useradd --system --gid app app && chown -R app:app /app
COPY --from=build /src/target/rules-api-1.0.0.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
