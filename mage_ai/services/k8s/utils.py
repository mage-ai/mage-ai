from kubernetes import client


def parse_affinity_config(affinity_config):
    if not affinity_config:
        return None

    affinity = client.V1Affinity(
        node_affinity=parse_node_affinity(affinity_config.get('nodeAffinity')),
        pod_affinity=parse_pod_affinity(affinity_config.get('podAffinity')),
        pod_anti_affinity=parse_pod_anti_affinity(affinity_config.get('podAntiAffinity'))
    )
    return affinity


def parse_node_affinity(node_affinity_config):
    if not node_affinity_config:
        return None

    required_terms = node_affinity_config.get(
        'requiredDuringSchedulingIgnoredDuringExecution', {}).get('nodeSelectorTerms', [])
    node_selector_terms = []
    for term in required_terms:
        match_expressions = [client.V1NodeSelectorRequirement(
            key=expr.get('key'),
            operator=expr.get('operator'),
            values=expr.get('values')
        ) for expr in term.get('matchExpressions', [])]

        node_selector_terms.append(client.V1NodeSelectorTerm(match_expressions=match_expressions))

    return client.V1NodeAffinity(
        required_during_scheduling_ignored_during_execution=client.V1NodeSelector(
            node_selector_terms=node_selector_terms)
    )


def parse_pod_affinity(pod_affinity_config):
    if not pod_affinity_config:
        return None

    required_terms = pod_affinity_config.get('requiredDuringSchedulingIgnoredDuringExecution', [])
    preferred_terms = pod_affinity_config.get('preferredDuringSchedulingIgnoredDuringExecution', [])

    required_affinity = parse_affinity_term_list(required_terms)
    preferred_affinity = parse_affinity_term_list(preferred_terms)

    return client.V1PodAffinity(
        required_during_scheduling_ignored_during_execution=required_affinity,
        preferred_during_scheduling_ignored_during_execution=preferred_affinity
    )


def parse_pod_anti_affinity(pod_anti_affinity_config):
    if not pod_anti_affinity_config:
        return None

    required_terms = pod_anti_affinity_config.get(
        'requiredDuringSchedulingIgnoredDuringExecution', [])
    preferred_terms = pod_anti_affinity_config.get(
        'preferredDuringSchedulingIgnoredDuringExecution', [])

    required_affinity = parse_affinity_term_list(required_terms)
    preferred_affinity = parse_affinity_term_list(preferred_terms)

    return client.V1PodAntiAffinity(
        required_during_scheduling_ignored_during_execution=required_affinity,
        preferred_during_scheduling_ignored_during_execution=preferred_affinity
    )


def parse_affinity_term_list(term_list):
    if not term_list:
        return None

    affinity_term_list = []
    for term in term_list:
        label_selector = client.V1LabelSelector(
            match_labels=term.get('labelSelector', {}).get('matchLabels', {}),
            match_expressions=[client.V1LabelSelectorRequirement(
                key=expr.get('key'),
                operator=expr.get('operator'),
                values=expr.get('values')
            ) for expr in term.get('labelSelector', {}).get('matchExpressions', [])]
        )

        topology_key = term.get('topologyKey')

        affinity_term_list.append(client.V1WeightedPodAffinityTerm(
            weight=term.get('weight'),
            pod_affinity_term=client.V1PodAffinityTerm(
                label_selector=label_selector,
                topology_key=topology_key
            )
        ))

    return affinity_term_list
