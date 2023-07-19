export default function existingNamespaceUpdateInterceptor(openmct, usersNamespace, shouldCheck) {
    let loggedNamespaceCheck = false;

    openmct.objects.addGetInterceptor({
        appliesTo: (identifier, domainObject) => {
            return shouldCheck;
        },
        invoke: (identifier, object) => {
            if (object.location === usersNamespace.key) {
                object.location = usersNamespace.id;
                openmct.objects.mutate(object, 'location', usersNamespace.id);

                if (object.composition?.length) {
                    let updatedComposition = false;

                    object.composition = object.composition.map((keystring) => {
                        if (typeof keystring === 'string') {
                            updatedComposition = true;

                            const parts = keystring.split(':', 2);

                            return {
                                namespace: parts[0],
                                key: parts[1]
                            }
                        }

                        return keystring;
                    });

                    if (updatedComposition) {
                        openmct.objects.mutate(object, 'composition', object.composition);
                    }
                }
            }

            // turn off if we've checked the user folder
            if (!loggedNamespaceCheck && (object.location === usersNamespace.key || object.location === usersNamespace.id)) {
                localStorage.setItem(`r5.0_old_namespace_checked:${usersNamespace.key}`, 'true');
                loggedNamespaceCheck = true;
            }

            return object;
        }
    });
}
