INSERT INTO metricas_servico (servico_id, coletado_em, cpu_percentual, memoria_gb, disco_gb, rede_gb, intervalo_segundos, status_coleta, energia_kwh, emissao_co2e_g)
SELECT id, NOW() - interval '4 minutes', 42, 1.2, 20, 3.1, 60, 'sucesso', 2.486, 120.5 FROM servicos WHERE nome = 'Billing API';
INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, intervalo_segundos)
SELECT id, NOW(), 'indisponivel', 60 FROM servicos ORDER BY id OFFSET 1 LIMIT 1;
